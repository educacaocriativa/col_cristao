import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── GET /api/comunicados ─────────────────────────────────────
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId, schoolId } = req.user!;
    const { class_id } = req.query;

    let classFilter = '';
    const params: unknown[] = [schoolId];

    if (role === 'aluno' || role === 'pais') {
      // Get classes for this student/parent's student
      classFilter = `AND (a.class_id IS NULL OR a.class_id IN (
        SELECT class_id FROM class_students WHERE student_id = $2 AND active = true))`;
      params.push(userId);
    } else if (class_id) {
      params.push(class_id);
      classFilter = `AND (a.class_id IS NULL OR a.class_id = $${params.length})`;
    }

    const result = await query(
      `SELECT a.id, a.title, a.content, a.priority, a.published_at, a.expires_at,
              a.class_id, c.full_name AS class_name,
              u.name AS creator_name, u.role AS creator_role
       FROM announcements a
       JOIN users u ON u.id = a.creator_id
       LEFT JOIN classes c ON c.id = a.class_id
       WHERE a.school_id = $1 AND a.published = true
         AND (a.expires_at IS NULL OR a.expires_at > NOW())
         ${classFilter}
       ORDER BY a.priority DESC, a.published_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /comunicados:', err);
    res.status(500).json({ message: 'Erro ao listar comunicados.' });
  }
});

// ── POST /api/comunicados ────────────────────────────────────
router.post('/', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolId, id: creatorId } = req.user!;
    const { title, content, priority, class_id, expires_at } = req.body;

    const result = await query(
      `INSERT INTO announcements (school_id, class_id, creator_id, title, content, priority, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [schoolId, class_id || null, creatorId, title, content, priority || 'normal', expires_at || null]
    );

    res.status(201).json({ id: result.rows[0].id, message: 'Comunicado publicado.' });
  } catch (err) {
    console.error('POST /comunicados:', err);
    res.status(500).json({ message: 'Erro ao criar comunicado.' });
  }
});

// ── DELETE /api/comunicados/:id ──────────────────────────────
router.delete('/:id', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM announcements WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Comunicado removido.' });
  } catch (err) {
    console.error('DELETE /comunicados/:id:', err);
    res.status(500).json({ message: 'Erro ao remover comunicado.' });
  }
});

export default router;
