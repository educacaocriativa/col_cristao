import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── Helper: award coins ───────────────────────────────────────
async function awardCoins(userId: string, amount: number, reason: string, refId?: string, description?: string) {
  if (amount <= 0) return;
  await query(
    `INSERT INTO student_coins (user_id, balance, total_earned)
     VALUES ($1, $2, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET balance = student_coins.balance + $2,
                   total_earned = student_coins.total_earned + $2,
                   updated_at = NOW()`,
    [userId, amount]
  );
  await query(
    `INSERT INTO coin_transactions (user_id, amount, reason, reference_id, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, amount, reason, refId || null, description || null]
  );
}

// ── POST /api/turmas/import — importar turmas em lote ────────
router.post('/import', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolId: userSchoolId } = req.user!;
    const { turmas: rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Nenhuma turma para importar.' });
    }

    const currentYear = new Date().getFullYear();

    // Get or create academic year once
    let ayId: string;
    const existingAy = await query(
      `SELECT id FROM academic_years WHERE school_id = $1 AND year = $2 LIMIT 1`,
      [userSchoolId, currentYear]
    );
    if (existingAy.rows.length) {
      ayId = existingAy.rows[0].id;
    } else {
      const created = await query(
        `INSERT INTO academic_years (school_id, year, start_date, end_date, active)
         VALUES ($1,$2,$3,$4,true) RETURNING id`,
        [userSchoolId, currentYear, `${currentYear}-02-01`, `${currentYear}-12-15`]
      );
      ayId = created.rows[0].id;
    }

    type ImportResult = { row: number; name: string; success: boolean; error?: string };
    const results: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;

      if (!r.name?.trim() || !r.grade_level_id) {
        results.push({ row: rowNum, name: r.name || `Linha ${rowNum}`, success: false, error: 'nome_turma e ano_serie são obrigatórios.' });
        continue;
      }

      try {
        const gl = await query(`SELECT name FROM grade_levels WHERE id = $1`, [r.grade_level_id]);
        const glName = gl.rows[0]?.name ?? '';
        const fullName = `${glName} | ${r.name.trim()}`;

        const classRes = await query(
          `INSERT INTO classes (school_id, academic_year_id, grade_level_id, name, full_name, shift)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [userSchoolId, ayId, r.grade_level_id, r.name.trim(), fullName, r.shift || 'manha']
        );
        const classId = classRes.rows[0].id;

        // Vincular disciplinas se informadas (array de IDs já resolvidos no frontend)
        if (Array.isArray(r.subject_ids) && r.subject_ids.length > 0) {
          for (const sid of r.subject_ids as string[]) {
            await query(
              `INSERT INTO class_subjects (class_id, subject_id)
               SELECT $1, $2
               WHERE NOT EXISTS (SELECT 1 FROM class_subjects WHERE class_id=$1 AND subject_id=$2)`,
              [classId, sid]
            );
          }
        }

        results.push({ row: rowNum, name: fullName, success: true });
      } catch (err: any) {
        results.push({ row: rowNum, name: r.name || `Linha ${rowNum}`, success: false, error: 'Erro ao criar turma.' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.status(207).json({ results, successCount, totalCount: rows.length });
  } catch (err) {
    console.error('POST /turmas/import:', err);
    res.status(500).json({ message: 'Erro na importação de turmas.' });
  }
});

// ── POST /api/turmas — criar turma (admin / super_admin) ─────
router.post('/', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolId: userSchoolId } = req.user!;
    const { school_id, grade_level_id, name, shift } = req.body;
    const targetSchoolId = school_id || userSchoolId;
    const currentYear = new Date().getFullYear();

    // Get or create academic year for this school
    let ayId: string;
    const existing = await query(
      `SELECT id FROM academic_years WHERE school_id = $1 AND year = $2 LIMIT 1`,
      [targetSchoolId, currentYear]
    );
    if (existing.rows.length) {
      ayId = existing.rows[0].id;
    } else {
      const created = await query(
        `INSERT INTO academic_years (school_id, year, start_date, end_date, active)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [targetSchoolId, currentYear, `${currentYear}-02-01`, `${currentYear}-12-15`]
      );
      ayId = created.rows[0].id;
    }

    const gl = await query(`SELECT name FROM grade_levels WHERE id = $1`, [grade_level_id]);
    const glName = gl.rows[0]?.name ?? '';
    const fullName = `${glName} | ${name}`;

    const result = await query(
      `INSERT INTO classes (school_id, academic_year_id, grade_level_id, name, full_name, shift)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [targetSchoolId, ayId, grade_level_id, name, fullName, shift || 'manha']
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /turmas:', err);
    res.status(500).json({ message: 'Erro ao criar turma.' });
  }
});

// ── GET /api/turmas ──────────────────────────────────────────
// Professor: suas turmas | Admin/Pedagógico/SuperAdmin: todas da escola
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId, schoolId } = req.user!;

    let sql: string;
    let params: unknown[];

    if (role === 'professor') {
      sql = `
        SELECT c.id, c.name, c.full_name, c.shift,
               gl.name AS grade_level_name, gl.segment,
               COUNT(DISTINCT cs2.student_id) AS student_count,
               s.name AS school_name,
               COALESCE((
                 SELECT json_agg(json_build_object(
                   'id', csub.id,
                   'subject_id', sub.id,
                   'name', sub.name,
                   'color', sub.color,
                   'icon', sub.icon
                 ))
                 FROM class_subjects csub
                 JOIN subjects sub ON sub.id = csub.subject_id
                 WHERE csub.class_id = c.id
               ), '[]'::json) AS subjects
        FROM classes c
        JOIN grade_levels gl ON gl.id = c.grade_level_id
        LEFT JOIN class_students cs2 ON cs2.class_id = c.id AND cs2.active = true
        JOIN schools s ON s.id = c.school_id
        WHERE c.id IN (
          SELECT DISTINCT class_id FROM class_subjects WHERE teacher_id = $1
          UNION
          SELECT DISTINCT class_id FROM class_teachers WHERE teacher_id = $1
        ) AND c.active = true
        GROUP BY c.id, gl.name, gl.segment, gl.order_index, s.name
        ORDER BY gl.order_index, c.name`;
      params = [userId];
    } else if (role === 'super_admin') {
      sql = `
        SELECT c.id, c.name, c.full_name, c.shift,
               gl.name AS grade_level_name, gl.segment, gl.order_index,
               COUNT(DISTINCT cs2.student_id) AS student_count,
               s.name AS school_name
        FROM classes c
        JOIN grade_levels gl ON gl.id = c.grade_level_id
        LEFT JOIN class_students cs2 ON cs2.class_id = c.id AND cs2.active = true
        JOIN schools s ON s.id = c.school_id
        WHERE c.active = true
        GROUP BY c.id, gl.name, gl.segment, gl.order_index, s.name
        ORDER BY s.name, gl.order_index, c.name`;
      params = [];
    } else {
      sql = `
        SELECT c.id, c.name, c.full_name, c.shift,
               gl.name AS grade_level_name, gl.segment, gl.order_index,
               COUNT(DISTINCT cs2.student_id) AS student_count,
               s.name AS school_name
        FROM classes c
        JOIN grade_levels gl ON gl.id = c.grade_level_id
        LEFT JOIN class_students cs2 ON cs2.class_id = c.id AND cs2.active = true
        JOIN schools s ON s.id = c.school_id
        WHERE c.school_id = $1 AND c.active = true
        GROUP BY c.id, gl.name, gl.segment, gl.order_index, s.name
        ORDER BY gl.order_index, c.name`;
      params = [schoolId];
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /turmas:', err);
    res.status(500).json({ message: 'Erro ao listar turmas.' });
  }
});

// ── PUT /api/turmas/:id ──────────────────────────────────────
router.put('/:id', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { name, shift, grade_level_id } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];

    if (name) {
      // Rebuild full_name with new name
      const gl = await query(
        `SELECT g.name FROM grade_levels g
         JOIN classes c ON c.grade_level_id = g.id
         WHERE c.id = $1`, [req.params.id]
      );
      const glName = gl.rows[0]?.name ?? '';
      params.push(name); updates.push(`name = $${params.length}`);
      params.push(`${glName} | ${name}`); updates.push(`full_name = $${params.length}`);
    }
    if (shift) { params.push(shift); updates.push(`shift = $${params.length}`); }
    if (grade_level_id) {
      const gl = await query(`SELECT name FROM grade_levels WHERE id = $1`, [grade_level_id]);
      const glName = gl.rows[0]?.name ?? '';
      const currentName = await query(`SELECT name FROM classes WHERE id = $1`, [req.params.id]);
      const cn = currentName.rows[0]?.name ?? '';
      params.push(grade_level_id); updates.push(`grade_level_id = $${params.length}`);
      params.push(`${glName} | ${cn}`); updates.push(`full_name = $${params.length}`);
    }

    if (!updates.length) { res.status(400).json({ message: 'Nenhum campo para atualizar.' }); return; }

    params.push(req.params.id);
    await query(`UPDATE classes SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    res.json({ message: 'Turma atualizada.' });
  } catch (err) {
    console.error('PUT /turmas/:id:', err);
    res.status(500).json({ message: 'Erro ao atualizar turma.' });
  }
});

// ── GET /api/turmas/:id ──────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const turma = await query(
      `SELECT c.id, c.name, c.full_name, c.shift,
              gl.name AS grade_level_name, gl.segment, gl.max_alternatives,
              s.name AS school_name,
              ay.id AS academic_year_id, ay.year AS academic_year
       FROM classes c
       JOIN grade_levels gl ON gl.id = c.grade_level_id
       JOIN schools s ON s.id = c.school_id
       LEFT JOIN academic_years ay ON ay.id = c.academic_year_id
       WHERE c.id = $1 AND c.active = true`,
      [id]
    );

    if (!turma.rows.length) {
      res.status(404).json({ message: 'Turma não encontrada.' });
      return;
    }

    const subjects = await query(
      `SELECT cs.id, sub.id AS subject_id, sub.name, sub.color, sub.icon,
              u.id AS teacher_id, u.name AS teacher_name
       FROM class_subjects cs
       JOIN subjects sub ON sub.id = cs.subject_id
       LEFT JOIN users u ON u.id = cs.teacher_id
       WHERE cs.class_id = $1`,
      [id]
    );

    const students = await query(
      `SELECT u.id, u.name, u.email,
              sp.internal_enrollment, sp.birth_date
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE cs.class_id = $1 AND cs.active = true
       ORDER BY u.name`,
      [id]
    );

    res.json({
      ...turma.rows[0],
      subjects: subjects.rows,
      students: students.rows,
      studentCount: students.rows.length,
    });
  } catch (err) {
    console.error('GET /turmas/:id:', err);
    res.status(500).json({ message: 'Erro ao buscar turma.' });
  }
});

// ── GET /api/turmas/:id/alunos ───────────────────────────────
router.get('/:id/alunos', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.whatsapp,
              sp.internal_enrollment, sp.birth_date,
              sp.mother_name, sp.mother_whatsapp, sp.father_name, sp.father_whatsapp
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE cs.class_id = $1 AND cs.active = true
       ORDER BY u.name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /turmas/:id/alunos:', err);
    res.status(500).json({ message: 'Erro ao listar alunos.' });
  }
});

// ── GET /api/turmas/:id/chamada/historico?subject_id= ───────
// Retorna todas as datas e registros de chamada da turma (planilha completa)
// DEVE vir antes de GET /:id/chamada para não conflitar
router.get('/:id/chamada/historico', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { subject_id } = req.query;

    // Alunos ativos da turma
    const students = await query(
      `SELECT u.id, u.name
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       WHERE cs.class_id = $1 AND cs.active = true
       ORDER BY u.name`,
      [id]
    );

    // Todas as datas de chamada registradas para a turma
    const params: unknown[] = [id];
    let subFilter = '';
    if (subject_id) { params.push(subject_id); subFilter = ` AND a.subject_id = $${params.length}`; }

    const sessions = await query(
      `SELECT a.id AS attendance_id, a.date, a.subject_id,
              sub.name AS subject_name, sub.color AS subject_color
       FROM attendance a
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE a.class_id = $1 ${subFilter}
       ORDER BY a.date ASC, sub.name ASC`,
      params
    );

    if (!sessions.rows.length) {
      res.json({ students: students.rows, sessions: [], records: [] });
      return;
    }

    // Todos os registros de presença para essas sessões
    const sessionIds = sessions.rows.map((s: { attendance_id: string }) => s.attendance_id);
    const records = await query(
      `SELECT ar.attendance_id, ar.student_id, ar.status, ar.note
       FROM attendance_records ar
       WHERE ar.attendance_id = ANY($1::uuid[])`,
      [sessionIds]
    );

    res.json({
      students: students.rows,
      sessions: sessions.rows,
      records: records.rows,
    });
  } catch (err) {
    console.error('GET /turmas/:id/chamada/historico:', err);
    res.status(500).json({ message: 'Erro ao buscar histórico de chamadas.' });
  }
});

// ── GET /api/turmas/:id/chamada?date=YYYY-MM-DD&subject_id= ─
router.get('/:id/chamada', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const subjectId = req.query.subject_id as string;

    const att = await query(
      `SELECT a.id, a.date, a.subject_id, sub.name AS subject_name
       FROM attendance a
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE a.class_id = $1 AND a.date = $2 ${subjectId ? 'AND a.subject_id = $3' : ''}`,
      subjectId ? [id, date, subjectId] : [id, date]
    );

    if (!att.rows.length) {
      // Return empty records for each student
      const students = await query(
        `SELECT u.id, u.name FROM class_students cs
         JOIN users u ON u.id = cs.student_id
         WHERE cs.class_id = $1 AND cs.active = true ORDER BY u.name`,
        [id]
      );
      res.json({ date, records: students.rows.map(s => ({ student_id: s.id, student_name: s.name, status: null })) });
      return;
    }

    const records = await query(
      `SELECT ar.student_id, u.name AS student_name, ar.status, ar.note
       FROM attendance_records ar
       JOIN users u ON u.id = ar.student_id
       WHERE ar.attendance_id = $1
       ORDER BY u.name`,
      [att.rows[0].id]
    );

    res.json({
      attendanceId: att.rows[0].id,
      date: att.rows[0].date,
      subjectId: att.rows[0].subject_id,
      subjectName: att.rows[0].subject_name,
      records: records.rows,
    });
  } catch (err) {
    console.error('GET /turmas/:id/chamada:', err);
    res.status(500).json({ message: 'Erro ao buscar chamada.' });
  }
});

// ── POST /api/turmas/:id/chamada ─────────────────────────────
router.post('/:id/chamada', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { date, subject_id, records } = req.body;
    const teacherId = req.user!.id;

    // Upsert attendance header
    const existing = await query(
      `SELECT id FROM attendance WHERE class_id = $1 AND subject_id = $2 AND date = $3`,
      [id, subject_id, date]
    );

    let attendanceId: string;
    if (existing.rows.length) {
      attendanceId = existing.rows[0].id;
    } else {
      const ins = await query(
        `INSERT INTO attendance (class_id, subject_id, teacher_id, date)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [id, subject_id, teacherId, date]
      );
      attendanceId = ins.rows[0].id;
    }

    // Upsert each record
    for (const rec of records as { student_id: string; status: string; note?: string }[]) {
      await query(
        `INSERT INTO attendance_records (attendance_id, student_id, status, note)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (attendance_id, student_id)
         DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
        [attendanceId, rec.student_id, rec.status, rec.note || null]
      );
    }

    res.json({ message: 'Chamada salva com sucesso.', attendanceId });
  } catch (err) {
    console.error('POST /turmas/:id/chamada:', err);
    res.status(500).json({ message: 'Erro ao salvar chamada.' });
  }
});

// ── GET /api/turmas/:id/notas?bimester=&subject_id= ─────────
router.get('/:id/notas', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;
    const { bimester, subject_id } = req.query;

    let sql = `
      SELECT g.student_id, u.name AS student_name,
             g.subject_id, sub.name AS subject_name,
             g.bimester, g.score, g.recovery_score, g.final_score
      FROM grades g
      JOIN users u ON u.id = g.student_id
      JOIN subjects sub ON sub.id = g.subject_id
      WHERE g.class_id = $1`;
    const params: unknown[] = [id];

    // Professor só vê notas das disciplinas que ministra nessa turma
    if (role === 'professor') {
      params.push(userId);
      sql += ` AND g.subject_id IN (
        SELECT subject_id FROM class_subjects WHERE class_id = $1 AND teacher_id = $${params.length}
      )`;
    }

    if (bimester) { params.push(bimester); sql += ` AND g.bimester = $${params.length}`; }
    if (subject_id) { params.push(subject_id); sql += ` AND g.subject_id = $${params.length}`; }
    sql += ' ORDER BY u.name, g.bimester';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /turmas/:id/notas:', err);
    res.status(500).json({ message: 'Erro ao buscar notas.' });
  }
});

// ── GET /api/turmas/:id/grade-items?subject_id=&bimester= ───
router.get('/:id/grade-items', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { subject_id, bimester } = req.query;
    const params: unknown[] = [id];
    let filters = '';
    if (subject_id) { params.push(subject_id); filters += ` AND gi.subject_id = $${params.length}`; }
    if (bimester)   { params.push(bimester);   filters += ` AND gi.bimester = $${params.length}`; }

    // Items — include activity_id and activity metadata
    const items = await query(
      `SELECT gi.id, gi.item_type, gi.name, gi.date, gi.content, gi.max_score, gi.max_coins, gi.bimester,
              gi.subject_id, gi.activity_id,
              sub.name AS subject_name, sub.color AS subject_color,
              a.title AS activity_title, a.max_score AS activity_max_score,
              (SELECT COUNT(*) FROM activity_results ar WHERE ar.activity_id = gi.activity_id
                AND ar.status = 'completed') AS completed_count
       FROM grade_items gi
       JOIN subjects sub ON sub.id = gi.subject_id
       LEFT JOIN activities a ON a.id = gi.activity_id
       WHERE gi.class_id = $1 ${filters}
       ORDER BY gi.bimester, gi.date NULLS LAST, gi.created_at`,
      params
    );

    if (!items.rows.length) { res.json({ items: [], scores: [], autoScores: [] }); return; }

    const itemIds = items.rows.map((r: { id: string }) => r.id);

    // Manual scores (for item_type = 'sala')
    const scores = await query(
      `SELECT gis.item_id, gis.student_id, u.name AS student_name, gis.score
       FROM grade_item_scores gis
       JOIN users u ON u.id = gis.student_id
       WHERE gis.item_id = ANY($1::uuid[])`,
      [itemIds]
    );

    // Auto scores from activity_results (for item_type = 'expedicao' with activity_id)
    const activityIds = items.rows
      .filter((r: { activity_id: string | null }) => r.activity_id)
      .map((r: { id: string; activity_id: string }) => ({ item_id: r.id, activity_id: r.activity_id }));

    const autoScores: unknown[] = [];
    for (const { item_id, activity_id } of activityIds) {
      const res2 = await query(
        `SELECT $1::uuid AS item_id, ar.student_id, u.name AS student_name,
                ar.final_score AS score, ar.status AS activity_status, ar.finished_at
         FROM activity_results ar
         JOIN users u ON u.id = ar.student_id
         WHERE ar.activity_id = $2
         ORDER BY u.name`,
        [item_id, activity_id]
      );
      autoScores.push(...res2.rows);
    }

    res.json({ items: items.rows, scores: scores.rows, autoScores });
  } catch (err) {
    console.error('GET /turmas/:id/grade-items:', err);
    res.status(500).json({ message: 'Erro ao buscar avaliações.' });
  }
});

// ── GET /api/turmas/:id/activities-for-grading ───────────────
// Retorna expedições da turma para vincular a grade items
router.get('/:id/activities-for-grading', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { subject_id } = req.query;
    const params: unknown[] = [req.params.id];
    let subFilter = '';
    if (subject_id) { params.push(subject_id); subFilter = ` AND a.subject_id = $${params.length}`; }

    const result = await query(
      `SELECT a.id, a.title, a.activity_type, a.bimester, a.max_score, a.published,
              sub.name AS subject_name, sub.color AS subject_color,
              COUNT(aq.id) AS question_count,
              COUNT(ar.id) FILTER (WHERE ar.status = 'completed') AS completed_count
       FROM activities a
       JOIN subjects sub ON sub.id = a.subject_id
       LEFT JOIN activity_questions aq ON aq.activity_id = a.id
       LEFT JOIN activity_results ar ON ar.activity_id = a.id
       WHERE a.class_id = $1 ${subFilter}
       GROUP BY a.id, sub.name, sub.color
       ORDER BY a.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /turmas/:id/activities-for-grading:', err);
    res.status(500).json({ message: 'Erro ao buscar expedições.' });
  }
});

// ── POST /api/turmas/:id/grade-items ─────────────────────────
router.post('/:id/grade-items', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { subject_id, bimester, item_type, name, date, content, max_score, max_coins, academic_year_id, activity_id } = req.body;
    if (!subject_id || !bimester || !name || !max_score) {
      res.status(400).json({ message: 'subject_id, bimester, name e max_score são obrigatórios.' });
      return;
    }
    const result = await query(
      `INSERT INTO grade_items (class_id, subject_id, bimester, academic_year_id, item_type, name, date, content, max_score, max_coins, activity_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [id, subject_id, bimester, academic_year_id || null, item_type || 'sala', name, date || null, content || null, max_score, max_coins ?? 0, activity_id || null, req.user!.id]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /turmas/:id/grade-items:', err);
    res.status(500).json({ message: 'Erro ao criar avaliação.' });
  }
});

// ── PUT /api/turmas/:id/grade-items/:itemId ──────────────────
router.put('/:id/grade-items/:itemId', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { name, date, content, max_score, max_coins, item_type, activity_id } = req.body;
    await query(
      `UPDATE grade_items SET name=$1, date=$2, content=$3, max_score=$4, max_coins=$5, item_type=$6, activity_id=$7 WHERE id=$8 AND class_id=$9`,
      [name, date || null, content || null, max_score, max_coins ?? 0, item_type, activity_id || null, req.params.itemId, req.params.id]
    );
    res.json({ message: 'Avaliação atualizada.' });
  } catch (err) {
    console.error('PUT /turmas/:id/grade-items/:itemId:', err);
    res.status(500).json({ message: 'Erro ao atualizar avaliação.' });
  }
});

// ── DELETE /api/turmas/:id/grade-items/:itemId ───────────────
router.delete('/:id/grade-items/:itemId', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM grade_items WHERE id=$1 AND class_id=$2`, [req.params.itemId, req.params.id]);
    res.json({ message: 'Avaliação removida.' });
  } catch (err) {
    console.error('DELETE /turmas/:id/grade-items/:itemId:', err);
    res.status(500).json({ message: 'Erro ao remover avaliação.' });
  }
});

// ── POST /api/turmas/:id/grade-items/:itemId/scores ──────────
router.post('/:id/grade-items/:itemId/scores', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { scores } = req.body; // [{ student_id, score }]
    const itemId = req.params.itemId as string;

    // Fetch item to get max_score and max_coins
    const itemRes = await query(
      `SELECT max_score, max_coins, name FROM grade_items WHERE id = $1`,
      [itemId]
    );
    const item = itemRes.rows[0];

    for (const s of scores as { student_id: string; score: number | null }[]) {
      await query(
        `INSERT INTO grade_item_scores (item_id, student_id, score)
         VALUES ($1,$2,$3)
         ON CONFLICT (item_id, student_id) DO UPDATE SET score = EXCLUDED.score, updated_at = now()`,
        [itemId, s.student_id, s.score]
      );

      // Award coins proportionally if score is valid and item has max_coins
      if (s.score != null && item?.max_coins > 0 && item?.max_score > 0) {
        const coinsToAward = Math.round((s.score / item.max_score) * item.max_coins);
        await awardCoins(
          s.student_id,
          coinsToAward,
          'grade',
          itemId,
          `Nota em ${item.name}`
        );
      }
    }
    res.json({ message: 'Notas salvas.' });
  } catch (err) {
    console.error('POST /turmas/:id/grade-items/:itemId/scores:', err);
    res.status(500).json({ message: 'Erro ao salvar notas.' });
  }
});

// ── POST /api/turmas/:id/notas ───────────────────────────────
router.post('/:id/notas', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { grades, academic_year_id } = req.body;
    // grades: [{ student_id, subject_id, bimester, score, recovery_score }]

    for (const g of grades as { student_id: string; subject_id: string; bimester: number; score: number; recovery_score?: number }[]) {
      const finalScore = g.recovery_score != null && g.recovery_score > (g.score ?? 0)
        ? g.recovery_score
        : g.score;

      await query(
        `INSERT INTO grades (student_id, class_id, subject_id, academic_year_id, bimester, score, recovery_score, final_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (student_id, class_id, subject_id, academic_year_id, bimester)
         DO UPDATE SET score = EXCLUDED.score, recovery_score = EXCLUDED.recovery_score, final_score = EXCLUDED.final_score, updated_at = NOW()`,
        [g.student_id, id, g.subject_id, academic_year_id, g.bimester, g.score, g.recovery_score ?? null, finalScore]
      );
    }

    res.json({ message: 'Notas salvas com sucesso.' });
  } catch (err) {
    console.error('POST /turmas/:id/notas:', err);
    res.status(500).json({ message: 'Erro ao salvar notas.' });
  }
});

// ── POST /api/turmas/:id/add-aluno — matrícula na turma ──────
router.post('/:id/add-aluno', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { user_id } = req.body;
    await query(
      `INSERT INTO class_students (class_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, user_id]
    );
    res.status(201).json({ message: 'Aluno matriculado.' });
  } catch (err) {
    console.error('POST /turmas/:id/add-aluno:', err);
    res.status(500).json({ message: 'Erro ao matricular aluno.' });
  }
});

// ── POST /api/turmas/:id/add-pedagogico ──────────────────────
router.post('/:id/add-pedagogico', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { user_id } = req.body;
    await query(
      `INSERT INTO class_pedagogico (class_id, pedagogico_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, user_id]
    );
    res.status(201).json({ message: 'Pedagógico vinculado.' });
  } catch (err) {
    console.error('POST /turmas/:id/add-pedagogico:', err);
    res.status(500).json({ message: 'Erro ao vincular pedagógico.' });
  }
});

// ── POST /api/turmas/:id/add-subjects — vincula disciplinas à turma ──
router.post('/:id/add-subjects', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const classId = req.params.id;
    const { subject_ids } = req.body as { subject_ids: string[] };
    if (!Array.isArray(subject_ids) || subject_ids.length === 0) {
      return res.status(400).json({ message: 'Nenhuma disciplina informada.' });
    }
    for (const sid of subject_ids) {
      await query(
        `INSERT INTO class_subjects (class_id, subject_id)
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM class_subjects WHERE class_id = $1 AND subject_id = $2
         )`,
        [classId, sid]
      );
    }
    res.status(201).json({ message: 'Disciplinas vinculadas.' });
  } catch (err) {
    console.error('POST /turmas/:id/add-subjects:', err);
    res.status(500).json({ message: 'Erro ao vincular disciplinas.' });
  }
});

// ── POST /api/turmas/:id/add-professor ───────────────────────
// Vincula professor à turma e às disciplinas que ele leciona nela
router.post('/:id/add-professor', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const classId = req.params.id;
    const { user_id, subject_ids } = req.body as { user_id: string; subject_ids?: string[] };

    // Vínculo na tabela class_teachers
    await query(
      `INSERT INTO class_teachers (class_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [classId, user_id]
    );

    // Vínculo nas disciplinas (class_subjects com teacher_id)
    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      for (const sid of subject_ids) {
        // Garante que a disciplina existe na turma (sem professor)
        await query(
          `INSERT INTO class_subjects (class_id, subject_id)
           SELECT $1, $2
           WHERE NOT EXISTS (SELECT 1 FROM class_subjects WHERE class_id=$1 AND subject_id=$2)`,
          [classId, sid]
        );
        // Atribui o professor à disciplina nesta turma
        await query(
          `UPDATE class_subjects SET teacher_id = $1
           WHERE class_id = $2 AND subject_id = $3 AND teacher_id IS NULL`,
          [user_id, classId, sid]
        );
      }
    }

    res.status(201).json({ message: 'Professor vinculado.' });
  } catch (err) {
    console.error('POST /turmas/:id/add-professor:', err);
    res.status(500).json({ message: 'Erro ao vincular professor.' });
  }
});

export default router;
