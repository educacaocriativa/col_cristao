import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { sendWelcomeEmail } from '../config/mailer';

const ROLE_PREFIX_SCHOOLS: Record<string, string> = { admin: 'ADM' };

async function genAdminCode(schoolId: string): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const countRes = await query(
    `SELECT COUNT(*) AS cnt FROM users WHERE school_id = $1 AND role = 'admin' AND deleted_at IS NULL`,
    [schoolId]
  );
  const seq = String(Number(countRes.rows[0].cnt) + 1).padStart(3, '0');
  return `ADM${year}${seq}`;
}

const router = Router();

// GET / — lista escolas ativas (não excluídas)
router.get('/', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT s.id, s.name, s.city, s.state, s.address, s.zip_code,
             s.manager_name, s.manager_email, s.manager_whatsapp,
             s.active, s.created_at,
             COUNT(DISTINCT CASE WHEN u.role = 'aluno'     AND u.deleted_at IS NULL THEN u.id END) AS student_count,
             COUNT(DISTINCT CASE WHEN u.role = 'professor' AND u.deleted_at IS NULL THEN u.id END) AS teacher_count,
             COUNT(DISTINCT CASE WHEN u.role = 'admin'     AND u.deleted_at IS NULL THEN u.id END) AS admin_count,
             au.admin_id, au.admin_name, au.admin_email, au.admin_profile_code, au.admin_cpf
      FROM schools s
      LEFT JOIN users u ON u.school_id = s.id
      LEFT JOIN LATERAL (
        SELECT a.id AS admin_id, a.name AS admin_name, a.email AS admin_email,
               a.profile_code AS admin_profile_code, a.cpf AS admin_cpf
        FROM users a
        WHERE a.school_id = s.id AND a.role = 'admin' AND a.deleted_at IS NULL
        ORDER BY a.created_at
        LIMIT 1
      ) au ON true
      WHERE s.deleted_at IS NULL
      GROUP BY s.id, au.admin_id, au.admin_name, au.admin_email, au.admin_profile_code, au.admin_cpf
      ORDER BY s.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /schools:', err);
    res.status(500).json({ message: 'Erro ao listar escolas.' });
  }
});

// GET /deleted — lista escolas na lixeira
router.get('/deleted', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT s.id, s.name, s.city, s.state, s.address, s.zip_code,
             s.manager_name, s.manager_email, s.manager_whatsapp,
             s.active, s.created_at, s.deleted_at,
             COUNT(DISTINCT CASE WHEN u.role = 'aluno'     THEN u.id END) AS student_count,
             COUNT(DISTINCT CASE WHEN u.role = 'professor' THEN u.id END) AS teacher_count,
             COUNT(DISTINCT CASE WHEN u.role = 'admin'     THEN u.id END) AS admin_count
      FROM schools s
      LEFT JOIN users u ON u.school_id = s.id
      WHERE s.deleted_at IS NOT NULL
      GROUP BY s.id
      ORDER BY s.deleted_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /schools/deleted:', err);
    res.status(500).json({ message: 'Erro ao listar escolas excluídas.' });
  }
});

// Campos obrigatórios conforme schema (NOT NULL) — manter alinhado com schema.sql
const REQUIRED_SCHOOL_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'name',             label: 'nome da unidade' },
  { key: 'address',          label: 'endereço' },
  { key: 'city',             label: 'cidade' },
  { key: 'state',            label: 'estado' },
  { key: 'manager_name',     label: 'nome do diretor' },
  { key: 'manager_email',    label: 'e-mail do diretor' },
  { key: 'manager_whatsapp', label: 'whatsapp do diretor' },
  { key: 'manager_cpf',      label: 'CPF do diretor' },
];

function validateSchoolPayload(s: Record<string, unknown>): string[] {
  const missing = REQUIRED_SCHOOL_FIELDS
    .filter(({ key }) => !String(s[key] ?? '').trim())
    .map(({ label }) => label);
  const state = String(s.state ?? '').trim();
  if (state && state.length !== 2) missing.push('estado deve ter 2 letras (UF)');
  return missing;
}

function translateUniqueError(detail: string | undefined): string {
  const d = detail ?? '';
  if (d.includes('manager_email')) return 'E-mail do diretor já está em uso.';
  if (d.includes('manager_cpf'))   return 'CPF do diretor já está em uso.';
  if (d.includes('email'))         return 'E-mail já cadastrado.';
  return 'Registro duplicado.';
}

// POST / — cria uma nova escola
router.post('/', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      address,
      city,
      state,
      zip_code,
      manager_name,
      manager_email,
      manager_whatsapp,
      manager_cpf,
    } = req.body;

    const missing = validateSchoolPayload(req.body);
    if (missing.length > 0) {
      return res.status(400).json({ message: `Campos obrigatórios ausentes: ${missing.join(', ')}.` });
    }

    const result = await query(
      `INSERT INTO schools (name, address, city, state, zip_code, manager_name, manager_email, manager_whatsapp, manager_cpf)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        name.trim(),
        address.trim(),
        city.trim(),
        state.trim().toUpperCase(),
        zip_code?.trim() || null,
        manager_name.trim(),
        manager_email.toLowerCase().trim(),
        manager_whatsapp.trim(),
        manager_cpf.trim(),
      ]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ message: translateUniqueError(err.detail) });
    }
    console.error('POST /schools:', err);
    res.status(500).json({ message: 'Erro ao criar escola.' });
  }
});

// POST /import — importa múltiplas escolas em lote (CSV)
router.post('/import', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { schools: schoolsData } = req.body;
    if (!Array.isArray(schoolsData) || schoolsData.length === 0) {
      return res.status(400).json({ message: 'Nenhuma escola para importar.' });
    }

    type ImportResult = { row: number; name: string; success: boolean; error?: string };
    const results: ImportResult[] = [];

    for (let i = 0; i < schoolsData.length; i++) {
      const s = schoolsData[i];
      const rowNum = i + 1;

      const missing = validateSchoolPayload(s);
      if (missing.length > 0) {
        results.push({
          row: rowNum,
          name: s.name || `Linha ${rowNum}`,
          success: false,
          error: `Campos obrigatórios ausentes: ${missing.join(', ')}.`,
        });
        continue;
      }

      try {
        // 1. Criar escola
        const schoolRes = await query(
          `INSERT INTO schools (name, address, city, state, zip_code, manager_name, manager_email, manager_whatsapp, manager_cpf)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [
            s.name.trim(),
            s.address.trim(),
            s.city.trim(),
            s.state.trim().toUpperCase(),
            s.zip_code?.trim() || null,
            s.manager_name.trim(),
            s.manager_email.toLowerCase().trim(),
            s.manager_whatsapp.trim(),
            s.manager_cpf.trim(),
          ]
        );
        const schoolId = schoolRes.rows[0].id;

        // 2. Criar admin (se fornecido)
        if (s.admin_name?.trim() && s.admin_email?.trim()) {
          const profileCode = await genAdminCode(schoolId);
          const cpfDigits = (s.admin_cpf || '').replace(/\D/g, '');
          const finalPassword = cpfDigits.length >= 3
            ? `${profileCode}@${cpfDigits.substring(0, 3)}`
            : `${profileCode}@CC2`;
          const hash = await bcrypt.hash(finalPassword, 10);

          await query(
            `INSERT INTO users (school_id, name, email, password_hash, role, cpf, profile_code)
             VALUES ($1,$2,$3,$4,'admin',$5,$6)`,
            [schoolId, s.admin_name.trim(), s.admin_email.toLowerCase().trim(), hash, s.admin_cpf?.trim() || null, profileCode]
          );

          sendWelcomeEmail({
            to: s.admin_email.toLowerCase().trim(),
            name: s.admin_name.trim(),
            profileCode,
            password: finalPassword,
            role: 'admin',
          }).catch(() => {});
        }

        results.push({ row: rowNum, name: s.name.trim(), success: true });
      } catch (err: any) {
        const msg = err.code === '23505' ? translateUniqueError(err.detail) : 'Erro ao criar escola.';
        results.push({ row: rowNum, name: s.name || `Linha ${rowNum}`, success: false, error: msg });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    res.status(207).json({ results, successCount, totalCount: schoolsData.length });
  } catch (err) {
    console.error('POST /schools/import:', err);
    res.status(500).json({ message: 'Erro na importação.' });
  }
});

// PUT /:id — atualiza uma escola existente
router.put('/:id', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      city,
      state,
      zip_code,
      manager_name,
      manager_email,
      manager_whatsapp,
      manager_cpf,
    } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined)              { fields.push(`name = $${paramIndex++}`);              values.push(name); }
    if (address !== undefined)           { fields.push(`address = $${paramIndex++}`);           values.push(address); }
    if (city !== undefined)              { fields.push(`city = $${paramIndex++}`);              values.push(city); }
    if (state !== undefined)             { fields.push(`state = $${paramIndex++}`);             values.push(state); }
    if (zip_code !== undefined)          { fields.push(`zip_code = $${paramIndex++}`);          values.push(zip_code); }
    if (manager_name !== undefined)      { fields.push(`manager_name = $${paramIndex++}`);      values.push(manager_name); }
    if (manager_email !== undefined)     { fields.push(`manager_email = $${paramIndex++}`);     values.push(manager_email); }
    if (manager_whatsapp !== undefined)  { fields.push(`manager_whatsapp = $${paramIndex++}`);  values.push(manager_whatsapp); }
    if (manager_cpf !== undefined)       { fields.push(`manager_cpf = $${paramIndex++}`);       values.push(manager_cpf); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
    }

    values.push(id);
    await query(
      `UPDATE schools SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    res.json({ message: 'Escola atualizada com sucesso.' });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'E-mail do gestor já está em uso.' });
    }
    console.error('PUT /schools/:id:', err);
    res.status(500).json({ message: 'Erro ao atualizar escola.' });
  }
});

// PUT /:id/deactivate — desativa a escola (soft delete)
router.put('/:id/deactivate', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query('UPDATE schools SET active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Escola desativada com sucesso.' });
  } catch (err) {
    console.error('PUT /schools/:id/deactivate:', err);
    res.status(500).json({ message: 'Erro ao desativar escola.' });
  }
});

// DELETE /:id — move para lixeira (soft delete com deleted_at)
router.delete('/:id', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query(
      `UPDATE schools SET deleted_at = NOW(), active = false WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Escola movida para a lixeira.' });
  } catch (err) {
    console.error('DELETE /schools/:id:', err);
    res.status(500).json({ message: 'Erro ao excluir escola.' });
  }
});

// PUT /:id/restore — restaura escola da lixeira
router.put('/:id/restore', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query(
      `UPDATE schools SET deleted_at = NULL, active = true WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Escola restaurada com sucesso.' });
  } catch (err) {
    console.error('PUT /schools/:id/restore:', err);
    res.status(500).json({ message: 'Erro ao restaurar escola.' });
  }
});

// GET /grade-levels — lista todos os anos/séries disponíveis
router.get('/grade-levels', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, name, order_index, segment FROM grade_levels ORDER BY order_index`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /grade-levels:', err);
    res.status(500).json({ message: 'Erro ao listar anos escolares.' });
  }
});

export default router;
