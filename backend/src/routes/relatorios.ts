import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'pedagogico', 'super_admin'));

// ── GET /api/relatorios/desempenho ───────────────────────────
router.get('/desempenho', async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.user!;
    const { class_id, bimester, academic_year_id } = req.query;

    let filters = 'AND g.class_id IS NOT NULL';
    const params: unknown[] = [schoolId];

    if (class_id) { params.push(class_id); filters += ` AND g.class_id = $${params.length}`; }
    if (bimester) { params.push(bimester); filters += ` AND g.bimester = $${params.length}`; }
    if (academic_year_id) { params.push(academic_year_id); filters += ` AND g.academic_year_id = $${params.length}`; }

    // Per-class averages
    const classAvg = await query(
      `SELECT c.id AS class_id, c.full_name AS class_name,
              ROUND(AVG(g.final_score)::numeric, 1) AS average,
              COUNT(DISTINCT g.student_id) AS student_count,
              COUNT(*) FILTER (WHERE g.final_score >= 60) AS approved,
              COUNT(*) FILTER (WHERE g.final_score < 60) AS failing
       FROM grades g
       JOIN classes c ON c.id = g.class_id
       WHERE c.school_id = $1 ${filters}
       GROUP BY c.id, c.full_name
       ORDER BY average DESC`,
      params
    );

    // Per-subject averages
    const subjectAvg = await query(
      `SELECT sub.id AS subject_id, sub.name AS subject_name, sub.color,
              ROUND(AVG(g.final_score)::numeric, 1) AS average,
              COUNT(*) FILTER (WHERE g.final_score < 60) AS failing_count
       FROM grades g
       JOIN subjects sub ON sub.id = g.subject_id
       JOIN classes c ON c.id = g.class_id
       WHERE c.school_id = $1 ${filters}
       GROUP BY sub.id, sub.name, sub.color
       ORDER BY average ASC`,
      params
    );

    // At-risk students (< 50 in any subject)
    const atRisk = await query(
      `SELECT DISTINCT u.id, u.name AS student_name,
              c.full_name AS class_name,
              COUNT(DISTINCT g.subject_id) AS failing_subjects,
              ROUND(AVG(g.final_score)::numeric, 1) AS average
       FROM grades g
       JOIN users u ON u.id = g.student_id
       JOIN classes c ON c.id = g.class_id
       WHERE c.school_id = $1 AND g.final_score < 50 ${filters}
       GROUP BY u.id, u.name, c.full_name
       ORDER BY failing_subjects DESC, average ASC
       LIMIT 20`,
      params
    );

    res.json({
      classAverages: classAvg.rows,
      subjectAverages: subjectAvg.rows,
      atRiskStudents: atRisk.rows,
    });
  } catch (err) {
    console.error('GET /relatorios/desempenho:', err);
    res.status(500).json({ message: 'Erro ao gerar relatório.' });
  }
});

// ── GET /api/relatorios/bncc ─────────────────────────────────
router.get('/bncc', async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.user!;
    const { subject_id } = req.query;

    let subjectFilter = '';
    const params: unknown[] = [schoolId];

    if (subject_id) {
      params.push(subject_id);
      subjectFilter = `AND q.subject_id = $${params.length}`;
    }

    const result = await query(
      `SELECT bs.id, bs.code, bs.description, bs.subject_area, bs.grade_level,
              COUNT(DISTINCT q.id) AS question_count,
              COUNT(DISTINCT aq.activity_id) AS activity_count,
              CASE WHEN COUNT(DISTINCT q.id) >= 3 THEN 'alta'
                   WHEN COUNT(DISTINCT q.id) >= 1 THEN 'media'
                   ELSE 'baixa' END AS coverage
       FROM bncc_skills bs
       LEFT JOIN questions q ON q.bncc_skill_id = bs.id AND q.school_id = $1 ${subjectFilter}
       LEFT JOIN activity_questions aq ON aq.question_id = q.id
       GROUP BY bs.id, bs.code, bs.description, bs.subject_area, bs.grade_level
       ORDER BY coverage ASC, bs.code`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /relatorios/bncc:', err);
    res.status(500).json({ message: 'Erro ao buscar cobertura BNCC.' });
  }
});

// ── GET /api/relatorios/frequencia ───────────────────────────
router.get('/frequencia', async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.user!;
    const { class_id } = req.query;
    const params: unknown[] = [schoolId];

    let classFilter = '';
    if (class_id) { params.push(class_id); classFilter = `AND a.class_id = $${params.length}`; }

    const result = await query(
      `SELECT c.id AS class_id, c.full_name AS class_name,
              COUNT(*) FILTER (WHERE ar.status = 'presente') AS presencas,
              COUNT(*) FILTER (WHERE ar.status = 'falta') AS faltas,
              COUNT(*) AS total,
              ROUND(COUNT(*) FILTER (WHERE ar.status = 'presente')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS percentual
       FROM attendance_records ar
       JOIN attendance a ON a.id = ar.attendance_id
       JOIN classes c ON c.id = a.class_id
       WHERE c.school_id = $1 ${classFilter}
       GROUP BY c.id, c.full_name
       ORDER BY percentual ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /relatorios/frequencia:', err);
    res.status(500).json({ message: 'Erro ao buscar frequência.' });
  }
});

export default router;
