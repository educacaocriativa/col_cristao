import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('super_admin'));

// GET / — lista com filtros
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { search, subject_area, grade_level } = req.query;
    const params: unknown[] = [];
    const where: string[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(code ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }
    if (subject_area) { params.push(subject_area); where.push(`subject_area = $${params.length}`); }
    if (grade_level)  { params.push(grade_level);  where.push(`grade_level = $${params.length}`); }

    const sql = `
      SELECT id, code, description, subject_area, grade_level, component, created_at
      FROM bncc_skills
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY subject_area, grade_level, code
      LIMIT 500`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /bncc:', err);
    res.status(500).json({ message: 'Erro ao listar habilidades.' });
  }
});

// GET /meta — áreas e anos distintos para filtros
router.get('/meta', async (_req, res) => {
  try {
    const [areas, levels] = await Promise.all([
      query(`SELECT DISTINCT subject_area FROM bncc_skills WHERE subject_area IS NOT NULL ORDER BY subject_area`),
      query(`SELECT DISTINCT grade_level  FROM bncc_skills WHERE grade_level  IS NOT NULL ORDER BY grade_level`),
    ]);
    res.json({ subject_areas: areas.rows.map(r => r.subject_area), grade_levels: levels.rows.map(r => r.grade_level) });
  } catch (err) {
    console.error('GET /bncc/meta:', err);
    res.status(500).json({ message: 'Erro ao buscar metadados.' });
  }
});

// POST / — cria uma habilidade
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { code, description, subject_area, grade_level, component } = req.body;
    if (!code || !description) return res.status(400).json({ message: 'Código e descrição são obrigatórios.' });

    const result = await query(
      `INSERT INTO bncc_skills (code, description, subject_area, grade_level, component)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [code.trim().toUpperCase(), description.trim(), subject_area || null, grade_level || null, component || null]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ message: 'Código BNCC já existe.' });
    console.error('POST /bncc:', err);
    res.status(500).json({ message: 'Erro ao criar habilidade.' });
  }
});

// POST /bulk — importação CSV (frontend já parseia, envia array)
router.post('/bulk', async (req: AuthRequest, res) => {
  try {
    const { skills } = req.body as { skills: { code: string; description: string; subject_area?: string; grade_level?: string; component?: string }[] };
    if (!Array.isArray(skills) || skills.length === 0) return res.status(400).json({ message: 'Nenhuma habilidade enviada.' });

    let inserted = 0;
    let skipped  = 0;
    for (const s of skills) {
      if (!s.code || !s.description) { skipped++; continue; }
      try {
        await query(
          `INSERT INTO bncc_skills (code, description, subject_area, grade_level, component)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [s.code.trim().toUpperCase(), s.description.trim(), s.subject_area || null, s.grade_level || null, s.component || null]
        );
        inserted++;
      } catch { skipped++; }
    }
    res.json({ inserted, skipped });
  } catch (err) {
    console.error('POST /bncc/bulk:', err);
    res.status(500).json({ message: 'Erro na importação.' });
  }
});

// PUT /:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { code, description, subject_area, grade_level, component } = req.body;
    await query(
      `UPDATE bncc_skills SET code=$1, description=$2, subject_area=$3, grade_level=$4, component=$5 WHERE id=$6`,
      [code.trim().toUpperCase(), description.trim(), subject_area || null, grade_level || null, component || null, req.params.id]
    );
    res.json({ message: 'Atualizado.' });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ message: 'Código BNCC já existe.' });
    console.error('PUT /bncc/:id:', err);
    res.status(500).json({ message: 'Erro ao atualizar.' });
  }
});

// DELETE /:id
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM bncc_skills WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Removido.' });
  } catch (err) {
    console.error('DELETE /bncc/:id:', err);
    res.status(500).json({ message: 'Erro ao remover.' });
  }
});

export default router;
