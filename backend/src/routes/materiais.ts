import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── GET /api/materiais ───────────────────────────────────────
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId, schoolId } = req.user!;
    const { subject_id, class_id, bimester, material_type } = req.query;

    let schoolFilter = 'AND m.school_id = $1';
    let params: unknown[] = [schoolId];

    if (role === 'aluno') {
      schoolFilter = `AND m.class_id IN (
        SELECT class_id FROM class_students WHERE student_id = $1 AND active = true)`;
      params = [userId];
    } else if (role === 'professor') {
      schoolFilter = `AND m.creator_id = $1`;
      params = [userId];
    }

    let sql = `
      SELECT m.id, m.title, m.description, m.material_type,
             m.vimeo_id, m.file_url, m.s3_key, m.file_size_bytes,
             m.bimester, m.published, m.created_at,
             sub.id AS subject_id, sub.name AS subject_name, sub.color AS subject_color,
             c.full_name AS class_name, u.name AS creator_name
      FROM materials m
      JOIN subjects sub ON sub.id = m.subject_id
      LEFT JOIN classes c ON c.id = m.class_id
      JOIN users u ON u.id = m.creator_id
      WHERE m.published = true ${schoolFilter}`;

    if (subject_id) { params.push(subject_id); sql += ` AND m.subject_id = $${params.length}`; }
    if (class_id) { params.push(class_id); sql += ` AND m.class_id = $${params.length}`; }
    if (bimester) { params.push(bimester); sql += ` AND m.bimester = $${params.length}`; }
    if (material_type) { params.push(material_type); sql += ` AND m.material_type = $${params.length}`; }

    sql += ' ORDER BY m.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /materiais:', err);
    res.status(500).json({ message: 'Erro ao listar materiais.' });
  }
});

// ── POST /api/materiais ──────────────────────────────────────
router.post('/', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolId, id: creatorId } = req.user!;
    const { title, description, material_type, subject_id, class_id, bimester, vimeo_id, file_url, s3_key, file_size_bytes } = req.body;

    const result = await query(
      `INSERT INTO materials (school_id, class_id, subject_id, creator_id, title, description,
        material_type, vimeo_id, file_url, s3_key, file_size_bytes, bimester, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true) RETURNING id`,
      [schoolId, class_id || null, subject_id, creatorId, title, description || null,
       material_type, vimeo_id || null, file_url || null, s3_key || null, file_size_bytes || null, bimester || null]
    );

    res.status(201).json({ id: result.rows[0].id, message: 'Material adicionado.' });
  } catch (err) {
    console.error('POST /materiais:', err);
    res.status(500).json({ message: 'Erro ao criar material.' });
  }
});

// ── DELETE /api/materiais/:id ────────────────────────────────
router.delete('/:id', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM materials WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Material removido.' });
  } catch (err) {
    console.error('DELETE /materiais/:id:', err);
    res.status(500).json({ message: 'Erro ao remover material.' });
  }
});

export default router;
