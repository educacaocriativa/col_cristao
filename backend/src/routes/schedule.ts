import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Faixas de datas por bimestre (2025)
const BIMESTER_RANGES: Record<number, { start: string; end: string }> = {
  1: { start: '2025-02-03', end: '2025-04-30' },
  2: { start: '2025-05-05', end: '2025-07-11' },
  3: { start: '2025-07-28', end: '2025-09-30' },
  4: { start: '2025-10-06', end: '2025-12-12' },
};

// ── GET /api/schedule/week — aulas do professor na semana ────
// Precisa vir ANTES de GET / para não conflitar
router.get('/week', async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const result = await query(
      `SELECT ss.day_of_week, ss.period, ss.subject_id,
              sub.name AS subject_name, sub.color AS subject_color, sub.icon AS subject_icon,
              c.id AS class_id, c.full_name AS class_name
       FROM schedule_slots ss
       JOIN subjects sub ON sub.id = ss.subject_id
       JOIN classes c ON c.id = ss.class_id
       WHERE ss.teacher_id = $1
       ORDER BY ss.day_of_week, ss.period`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /schedule/week:', err);
    res.status(500).json({ message: 'Erro ao buscar agenda semanal.' });
  }
});

// ── GET /api/schedule/frequencia ─────────────────────────────
// Precisa vir ANTES de GET /:class_id para não ser capturado como parâmetro
router.get('/frequencia', async (req: AuthRequest, res) => {
  try {
    const { class_id, bimester } = req.query;
    if (!class_id || !bimester) {
      res.status(400).json({ message: 'class_id e bimester são obrigatórios.' });
      return;
    }

    const range = BIMESTER_RANGES[Number(bimester)];
    if (!range) { res.status(400).json({ message: 'Bimestre inválido.' }); return; }

    // Resumo por disciplina
    const bySubject = await query(
      `SELECT
         a.subject_id,
         sub.name AS subject_name, sub.color AS subject_color, sub.icon AS subject_icon,
         u.name  AS teacher_name,
         COUNT(DISTINCT a.id) AS classes_held,
         SUM(CASE WHEN ar.status = 'presente'    THEN 1 ELSE 0 END) AS total_presences,
         SUM(CASE WHEN ar.status = 'falta'        THEN 1 ELSE 0 END) AS total_absences,
         SUM(CASE WHEN ar.status = 'justificada'  THEN 1 ELSE 0 END) AS total_justified
       FROM attendance a
       JOIN subjects sub ON sub.id = a.subject_id
       LEFT JOIN users u ON u.id = a.teacher_id
       LEFT JOIN attendance_records ar ON ar.attendance_id = a.id
       WHERE a.class_id = $1 AND a.date BETWEEN $2 AND $3
       GROUP BY a.subject_id, sub.name, sub.color, sub.icon, u.name
       ORDER BY sub.name`,
      [class_id, range.start, range.end]
    );

    // Por aluno e disciplina
    const byStudent = await query(
      `SELECT
         ar.student_id,
         u.name  AS student_name,
         a.subject_id,
         SUM(CASE WHEN ar.status = 'presente'    THEN 1 ELSE 0 END) AS presences,
         SUM(CASE WHEN ar.status = 'falta'        THEN 1 ELSE 0 END) AS absences,
         SUM(CASE WHEN ar.status = 'justificada'  THEN 1 ELSE 0 END) AS justified,
         COUNT(*) AS total
       FROM attendance_records ar
       JOIN attendance a ON a.id = ar.attendance_id
       JOIN users u ON u.id = ar.student_id
       WHERE a.class_id = $1 AND a.date BETWEEN $2 AND $3
       GROUP BY ar.student_id, u.name, a.subject_id
       ORDER BY u.name`,
      [class_id, range.start, range.end]
    );

    // Total por aluno (todas as disciplinas)
    const totals = await query(
      `SELECT
         ar.student_id,
         u.name AS student_name,
         SUM(CASE WHEN ar.status = 'presente'    THEN 1 ELSE 0 END) AS presences,
         SUM(CASE WHEN ar.status = 'falta'        THEN 1 ELSE 0 END) AS absences,
         SUM(CASE WHEN ar.status = 'justificada'  THEN 1 ELSE 0 END) AS justified,
         COUNT(*) AS total
       FROM attendance_records ar
       JOIN attendance a ON a.id = ar.attendance_id
       JOIN users u ON u.id = ar.student_id
       WHERE a.class_id = $1 AND a.date BETWEEN $2 AND $3
       GROUP BY ar.student_id, u.name
       ORDER BY u.name`,
      [class_id, range.start, range.end]
    );

    res.json({
      bimester: Number(bimester),
      dateRange: range,
      bySubject: bySubject.rows,
      byStudent: byStudent.rows,
      totals: totals.rows,
    });
  } catch (err) {
    console.error('GET /schedule/frequencia:', err);
    res.status(500).json({ message: 'Erro ao buscar frequência.' });
  }
});

// ── GET /api/schedule?class_id=... ───────────────────────────
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { class_id } = req.query;
    if (!class_id) { res.status(400).json({ message: 'class_id obrigatório.' }); return; }

    const result = await query(
      `SELECT ss.id, ss.day_of_week, ss.period,
              ss.subject_id,
              sub.name  AS subject_name,
              sub.color AS subject_color,
              sub.icon  AS subject_icon,
              sub.code  AS subject_code,
              ss.teacher_id,
              u.name    AS teacher_name
       FROM schedule_slots ss
       JOIN subjects sub ON sub.id = ss.subject_id
       LEFT JOIN users u ON u.id = ss.teacher_id
       WHERE ss.class_id = $1
       ORDER BY ss.day_of_week, ss.period`,
      [class_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('GET /schedule:', err);
    res.status(500).json({ message: 'Erro ao buscar cronograma.' });
  }
});

// ── POST /api/schedule ────────────────────────────────────────
router.post('/', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { class_id, academic_year_id, slots } = req.body;
    if (!class_id) { res.status(400).json({ message: 'class_id obrigatório.' }); return; }

    await query(`DELETE FROM schedule_slots WHERE class_id = $1`, [class_id]);

    for (const s of (slots as { subject_id: string; teacher_id?: string; day_of_week: number; period: number }[])) {
      if (!s.subject_id) continue;
      await query(
        `INSERT INTO schedule_slots (class_id, academic_year_id, subject_id, teacher_id, day_of_week, period)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (class_id, day_of_week, period)
         DO UPDATE SET subject_id = EXCLUDED.subject_id, teacher_id = EXCLUDED.teacher_id`,
        [class_id, academic_year_id || null, s.subject_id, s.teacher_id || null, s.day_of_week, s.period]
      );
    }

    res.json({ message: 'Cronograma salvo com sucesso.' });
  } catch (err) {
    console.error('POST /schedule:', err);
    res.status(500).json({ message: 'Erro ao salvar cronograma.' });
  }
});

export default router;
