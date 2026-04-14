import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.use(authorize('professor', 'admin', 'pedagogico', 'super_admin'));

// ── GET /api/diario?class_id=&subject_id=&date_from=&date_to= ─
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId } = req.user!;
    const { class_id, subject_id, date_from, date_to } = req.query;

    let baseFilter = role === 'professor' ? 'AND pd.teacher_id = $1' : 'AND pd.teacher_id IS NOT NULL';
    const params: unknown[] = role === 'professor' ? [userId] : [];

    if (class_id) { params.push(class_id); baseFilter += ` AND pd.class_id = $${params.length}`; }
    if (subject_id) { params.push(subject_id); baseFilter += ` AND pd.subject_id = $${params.length}`; }
    if (date_from) { params.push(date_from); baseFilter += ` AND pd.date >= $${params.length}`; }
    if (date_to) { params.push(date_to); baseFilter += ` AND pd.date <= $${params.length}`; }

    const result = await query(
      `SELECT pd.id, pd.date, pd.content, pd.objectives, pd.methodology, pd.resources,
              u.name AS teacher_name, sub.name AS subject_name, sub.color AS subject_color,
              c.full_name AS class_name
       FROM pedagogical_diary pd
       JOIN users u ON u.id = pd.teacher_id
       JOIN subjects sub ON sub.id = pd.subject_id
       JOIN classes c ON c.id = pd.class_id
       WHERE 1=1 ${baseFilter}
       ORDER BY pd.date DESC, pd.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /diario:', err);
    res.status(500).json({ message: 'Erro ao buscar diário.' });
  }
});

// ── POST /api/diario ─────────────────────────────────────────
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { id: teacherId } = req.user!;
    const { class_id, subject_id, date, content, objectives, methodology, resources } = req.body;

    const result = await query(
      `INSERT INTO pedagogical_diary (teacher_id, class_id, subject_id, date, content, objectives, methodology, resources)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [teacherId, class_id, subject_id, date, content, objectives || null, methodology || null, resources || null]
    );

    res.status(201).json({ id: result.rows[0].id, message: 'Registro criado.' });
  } catch (err) {
    console.error('POST /diario:', err);
    res.status(500).json({ message: 'Erro ao criar registro.' });
  }
});

// ── PUT /api/diario/:id ──────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { content, objectives, methodology, resources } = req.body;
    await query(
      `UPDATE pedagogical_diary SET content=$1, objectives=$2, methodology=$3, resources=$4, updated_at=NOW()
       WHERE id=$5`,
      [content, objectives || null, methodology || null, resources || null, req.params.id]
    );
    res.json({ message: 'Registro atualizado.' });
  } catch (err) {
    console.error('PUT /diario/:id:', err);
    res.status(500).json({ message: 'Erro ao atualizar registro.' });
  }
});

// ── DELETE /api/diario/:id ───────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM pedagogical_diary WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Registro removido.' });
  } catch (err) {
    console.error('DELETE /diario/:id:', err);
    res.status(500).json({ message: 'Erro ao remover registro.' });
  }
});

export default router;
