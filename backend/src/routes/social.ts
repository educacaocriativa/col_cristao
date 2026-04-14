import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── GET /api/social/posts?class_id= ─────────────────────────
router.get('/posts', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId, schoolId } = req.user!;
    const { class_id } = req.query;

    let classFilter = '';
    const params: unknown[] = [];

    if (class_id) {
      params.push(class_id);
      classFilter = `AND sp.class_id = $${params.length}`;
    } else if (role === 'aluno' || role === 'pais') {
      params.push(userId);
      classFilter = `AND sp.class_id IN (
        SELECT class_id FROM class_students WHERE student_id = $1 AND active = true)`;
    } else {
      params.push(schoolId);
      classFilter = `AND c.school_id = $1`;
    }

    const result = await query(
      `SELECT sp.id, sp.content, sp.media_urls, sp.status, sp.likes_count, sp.created_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role,
              c.full_name AS class_name,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', sc.id, 'content', sc.content,
                  'author_name', cu.name, 'created_at', sc.created_at
                ) ORDER BY sc.created_at)
                 FROM social_comments sc
                 JOIN users cu ON cu.id = sc.author_id
                 WHERE sc.post_id = sp.id AND sc.status = 'approved'), '[]'
              ) AS comments,
              EXISTS(SELECT 1 FROM social_blacklist sb WHERE sb.user_id = sp.author_id AND sb.active = true) AS author_blacklisted
       FROM social_posts sp
       JOIN users u ON u.id = sp.author_id
       JOIN classes c ON c.id = sp.class_id
       WHERE sp.status IN ('approved','pending') ${classFilter}
       ORDER BY sp.created_at DESC
       LIMIT 50`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /social/posts:', err);
    res.status(500).json({ message: 'Erro ao listar posts.' });
  }
});

// ── POST /api/social/posts ───────────────────────────────────
router.post('/posts', async (req: AuthRequest, res) => {
  try {
    const { id: authorId } = req.user!;
    const { class_id, content } = req.body;
    const { role } = req.user!;

    // Teachers and admins auto-approved
    const status = ['professor', 'admin', 'pedagogico', 'super_admin'].includes(role)
      ? 'approved' : 'pending';

    const result = await query(
      `INSERT INTO social_posts (class_id, author_id, content, status)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [class_id, authorId, content, status]
    );

    res.status(201).json({ id: result.rows[0].id, status, message: 'Post criado.' });
  } catch (err) {
    console.error('POST /social/posts:', err);
    res.status(500).json({ message: 'Erro ao criar post.' });
  }
});

// ── POST /api/social/posts/:id/like ─────────────────────────
router.post('/posts/:id/like', async (req: AuthRequest, res) => {
  try {
    await query(
      `UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Like registrado.' });
  } catch (err) {
    console.error('POST /social/posts/:id/like:', err);
    res.status(500).json({ message: 'Erro ao registrar like.' });
  }
});

// ── POST /api/social/posts/:id/comentarios ───────────────────
router.post('/posts/:id/comentarios', async (req: AuthRequest, res) => {
  try {
    const { id: authorId, role } = req.user!;
    const { content } = req.body;
    const status = ['professor', 'admin', 'pedagogico', 'super_admin'].includes(role) ? 'approved' : 'pending';

    const result = await query(
      `INSERT INTO social_comments (post_id, author_id, content, status)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [req.params.id, authorId, content, status]
    );

    res.status(201).json({ id: result.rows[0].id, status });
  } catch (err) {
    console.error('POST /social/posts/:id/comentarios:', err);
    res.status(500).json({ message: 'Erro ao comentar.' });
  }
});

// ── DELETE /api/social/posts/:id ─────────────────────────────
router.delete('/posts/:id', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM social_posts WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Post removido.' });
  } catch (err) {
    console.error('DELETE /social/posts/:id:', err);
    res.status(500).json({ message: 'Erro ao remover post.' });
  }
});

// ── POST /api/social/posts/:id/moderar ───────────────────────
router.post('/posts/:id/moderar', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { status, reason } = req.body;
    await query(
      `UPDATE social_posts SET status=$1, reviewed_by=$2, reviewed_at=NOW(), rejection_reason=$3 WHERE id=$4`,
      [status, req.user!.id, reason || null, req.params.id]
    );
    res.json({ message: 'Post moderado.' });
  } catch (err) {
    console.error('POST /social/posts/:id/moderar:', err);
    res.status(500).json({ message: 'Erro ao moderar post.' });
  }
});

export default router;
