import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('super_admin', 'admin'));

// GET / — lista disciplinas (super_admin: todas; admin: só da sua escola)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, schoolId } = req.user!;
    const { school_id } = req.query;

    const { include_inactive } = req.query;
    const params: unknown[] = [];
    const where: string[] = include_inactive === 'true' ? [] : ['sub.active = true'];

    if (role === 'super_admin' && school_id) {
      params.push(school_id); where.push(`sub.school_id = $${params.length}`);
    } else if (role !== 'super_admin') {
      params.push(schoolId); where.push(`sub.school_id = $${params.length}`);
    }

    const result = await query(
      `SELECT sub.id, sub.name, sub.code, sub.color, sub.icon, sub.active, sub.created_at,
              s.name AS school_name, sub.school_id
       FROM subjects sub
       JOIN schools s ON s.id = sub.school_id
       WHERE ${where.length ? where.join(' AND ') : 'TRUE'}
       ORDER BY s.name, sub.name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /subjects:', err);
    res.status(500).json({ message: 'Erro ao listar disciplinas.' });
  }
});

// POST / — cria disciplina
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { role, schoolId } = req.user!;
    const { name, code, color, icon, school_id } = req.body;

    const targetSchool = role === 'super_admin' ? (school_id || schoolId) : schoolId;
    if (!name?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });

    const result = await query(
      `INSERT INTO subjects (school_id, name, code, color, icon)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [targetSchool, name.trim(), code?.trim() || null, color || '#6366f1', icon || '📚']
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ message: 'Código já existe nesta escola.' });
    console.error('POST /subjects:', err);
    res.status(500).json({ message: 'Erro ao criar disciplina.' });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, code, color, icon, active } = req.body;
    const fields: string[] = [];
    const vals: unknown[] = [];

    if (name   !== undefined) { vals.push(name.trim());         fields.push(`name=$${vals.length}`); }
    if (code   !== undefined) { vals.push(code?.trim() || null); fields.push(`code=$${vals.length}`); }
    if (color  !== undefined) { vals.push(color);               fields.push(`color=$${vals.length}`); }
    if (icon   !== undefined) { vals.push(icon);                fields.push(`icon=$${vals.length}`); }
    if (active !== undefined) { vals.push(active);              fields.push(`active=$${vals.length}`); }

    if (!fields.length) return res.status(400).json({ message: 'Nada a atualizar.' });

    vals.push(req.params.id);
    await query(`UPDATE subjects SET ${fields.join(',')} WHERE id=$${vals.length}`, vals);
    res.json({ message: 'Atualizado.' });
  } catch (err) {
    console.error('PUT /subjects/:id:', err);
    res.status(500).json({ message: 'Erro ao atualizar disciplina.' });
  }
});

// DELETE /:id — soft delete
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await query(`UPDATE subjects SET active=false WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Disciplina desativada.' });
  } catch (err) {
    console.error('DELETE /subjects/:id:', err);
    res.status(500).json({ message: 'Erro ao remover disciplina.' });
  }
});

export default router;
