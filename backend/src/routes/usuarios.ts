import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { sendWelcomeEmail } from '../config/mailer';
import { generateToken } from '../config/jwt';

const ROLE_PREFIX: Record<string, string> = {
  pedagogico: 'PED',
  professor:  'PRO',
  aluno:      'ALU',
  admin:      'ADM',
};

async function generateProfileCode(schoolId: string, role: string): Promise<string> {
  const prefix = ROLE_PREFIX[role] ?? role.toUpperCase().substring(0, 3);
  const year   = new Date().getFullYear().toString().slice(-2); // 2 digits
  const countRes = await query(
    `SELECT COUNT(*) AS cnt FROM users WHERE school_id = $1 AND role = $2 AND deleted_at IS NULL`,
    [schoolId, role]
  );
  const seq = String(Number(countRes.rows[0].cnt) + 1).padStart(3, '0');
  return `${prefix}${year}${seq}`;
}

const router = Router();
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// ── GET /api/usuarios ────────────────────────────────────────
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, schoolId } = req.user!;
    const { role: filterRole, search, active } = req.query;

    const params: unknown[] = [];
    let where = 'WHERE u.deleted_at IS NULL';

    if (role !== 'super_admin') {
      params.push(schoolId);
      where += ` AND u.school_id = $${params.length}`;
    }

    if (filterRole) { params.push(filterRole); where += ` AND u.role = $${params.length}`; }
    if (search) { params.push(`%${search}%`); where += ` AND u.name ILIKE $${params.length}`; }
    if (active !== undefined) { params.push(active === 'true'); where += ` AND u.active = $${params.length}`; }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.whatsapp, u.active, u.created_at, u.last_login,
              s.name AS school_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       ${where}
       ORDER BY u.role, u.name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /usuarios:', err);
    res.status(500).json({ message: 'Erro ao listar usuários.' });
  }
});

// ── POST /api/usuarios ───────────────────────────────────────
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { role: authRole, schoolId } = req.user!;
    const { name, email, password, role, whatsapp, school_id, cpf } = req.body;

    const targetSchool = authRole === 'super_admin' ? (school_id || schoolId) : schoolId;

    // Generate profile code for wizard-created roles; use it to build password
    const rolesWithCode = ['pedagogico', 'professor', 'aluno', 'admin'];
    let profileCode: string | null = null;
    let finalPassword = password || 'Colegio@2025';

    if (rolesWithCode.includes(role) && cpf) {
      profileCode = await generateProfileCode(targetSchool, role);
      const cpfDigits = cpf.replace(/\D/g, ''); // strip formatting
      finalPassword = `${profileCode}@${cpfDigits.substring(0, 3)}`;
    }

    const hash = await bcrypt.hash(finalPassword, 10);

    const result = await query(
      `INSERT INTO users (school_id, name, email, password_hash, role, whatsapp, cpf, profile_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [targetSchool, name, email.toLowerCase().trim(), hash, role, whatsapp || null, cpf || null, profileCode]
    );

    const userId = result.rows[0].id;

    // Send welcome email (non-blocking — failure does not affect the response)
    if (cpf && profileCode) {
      sendWelcomeEmail({
        to: email.toLowerCase().trim(),
        name,
        profileCode,
        password: finalPassword,
        role,
      }).catch(() => {});
    }

    res.status(201).json({ id: userId, message: 'Usuário criado com sucesso.' });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ message: 'E-mail já cadastrado.' });
      return;
    }
    console.error('POST /usuarios:', err);
    res.status(500).json({ message: 'Erro ao criar usuário.' });
  }
});

// ── POST /api/usuarios/import — importar usuários em lote ───
router.post('/import', async (req: AuthRequest, res) => {
  try {
    const { role: authRole, schoolId } = req.user!;
    const { usuarios: rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Nenhum usuário para importar.' });
    }

    type ImportResult = { row: number; name: string; success: boolean; error?: string };
    const results: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const u = rows[i];
      const rowNum = i + 1;

      if (!u.name?.trim() || !u.email?.trim()) {
        results.push({ row: rowNum, name: u.name || `Linha ${rowNum}`, success: false, error: 'nome e email são obrigatórios.' });
        continue;
      }

      const role = u.role || 'professor';
      const targetSchool = authRole === 'super_admin' ? (u.school_id || schoolId) : schoolId;

      try {
        const profileCode = await generateProfileCode(targetSchool, role);
        const cpfDigits = (u.cpf || '').replace(/\D/g, '');
        const finalPassword = cpfDigits.length >= 3
          ? `${profileCode}@${cpfDigits.substring(0, 3)}`
          : `${profileCode}@CC2`;
        const hash = await bcrypt.hash(finalPassword, 10);

        await query(
          `INSERT INTO users (school_id, name, email, password_hash, role, cpf, whatsapp, profile_code)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [targetSchool, u.name.trim(), u.email.toLowerCase().trim(), hash, role, u.cpf?.trim() || null, u.whatsapp?.trim() || null, profileCode]
        );

        if (u.cpf && profileCode) {
          sendWelcomeEmail({ to: u.email.toLowerCase().trim(), name: u.name.trim(), profileCode, password: finalPassword, role }).catch(() => {});
        }

        // Vincular às turmas com disciplinas (arrays de IDs já resolvidos no frontend)
        if (Array.isArray(u.class_ids) && u.class_ids.length > 0) {
          const userId = (await query(
            `SELECT id FROM users WHERE email = $1 AND school_id = $2 LIMIT 1`,
            [u.email.toLowerCase().trim(), targetSchool]
          )).rows[0]?.id;

          if (userId) {
            for (const classId of u.class_ids as string[]) {
              await query(
                `INSERT INTO class_teachers (class_id, teacher_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
                [classId, userId]
              );
              if (Array.isArray(u.subject_ids)) {
                for (const sid of u.subject_ids as string[]) {
                  await query(
                    `INSERT INTO class_subjects (class_id, subject_id)
                     SELECT $1,$2 WHERE NOT EXISTS (SELECT 1 FROM class_subjects WHERE class_id=$1 AND subject_id=$2)`,
                    [classId, sid]
                  );
                  await query(
                    `UPDATE class_subjects SET teacher_id=$1
                     WHERE class_id=$2 AND subject_id=$3 AND teacher_id IS NULL`,
                    [userId, classId, sid]
                  );
                }
              }
            }
          }
        }

        results.push({ row: rowNum, name: u.name.trim(), success: true });
      } catch (err: any) {
        const msg = err.code === '23505' ? 'E-mail já cadastrado.' : 'Erro ao criar usuário.';
        results.push({ row: rowNum, name: u.name || `Linha ${rowNum}`, success: false, error: msg });
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.status(207).json({ results, successCount, totalCount: rows.length });
  } catch (err) {
    console.error('POST /usuarios/import:', err);
    res.status(500).json({ message: 'Erro na importação.' });
  }
});

// ── PUT /api/usuarios/:id ────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, email, whatsapp, active, password } = req.body;
    const updates: string[] = [];
    const params: unknown[] = [];

    if (name) { params.push(name); updates.push(`name = $${params.length}`); }
    if (email) { params.push(email.toLowerCase().trim()); updates.push(`email = $${params.length}`); }
    if (whatsapp !== undefined) { params.push(whatsapp); updates.push(`whatsapp = $${params.length}`); }
    if (active !== undefined) { params.push(active); updates.push(`active = $${params.length}`); }
    if (password) { params.push(await bcrypt.hash(password, 10)); updates.push(`password_hash = $${params.length}`); }

    if (!updates.length) { res.status(400).json({ message: 'Nenhum campo para atualizar.' }); return; }

    params.push(req.params.id);
    await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at=NOW() WHERE id = $${params.length}`,
      params
    );

    res.json({ message: 'Usuário atualizado.' });
  } catch (err) {
    console.error('PUT /usuarios/:id:', err);
    res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});

// ── POST /api/usuarios/:id/impersonate ───────────────────────
router.post('/:id/impersonate', authorize('super_admin'), async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.school_id,
              s.name AS school_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const u = result.rows[0];
    const token = generateToken({
      id: u.id, email: u.email, role: u.role,
      schoolId: u.school_id, name: u.name,
    });

    res.json({
      token,
      user: {
        id: u.id, name: u.name, email: u.email, role: u.role,
        schoolId: u.school_id, schoolName: u.school_name,
      },
    });
  } catch (err) {
    console.error('POST /usuarios/:id/impersonate:', err);
    res.status(500).json({ message: 'Erro ao impersonar usuário.' });
  }
});

// ── DELETE /api/usuarios/:id (soft delete) ───────────────────
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await query(
      `UPDATE users SET deleted_at=NOW(), active=false WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Usuário desativado.' });
  } catch (err) {
    console.error('DELETE /usuarios/:id:', err);
    res.status(500).json({ message: 'Erro ao remover usuário.' });
  }
});

export default router;
