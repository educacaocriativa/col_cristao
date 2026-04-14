import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── GET /api/alunos ──────────────────────────────────────────
router.get('/', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { role, schoolId } = req.user!;
    const { class_id, search } = req.query;
    const params: unknown[] = [];

    let whereSchool = '';
    if (role !== 'super_admin') {
      params.push(schoolId);
      whereSchool = `AND u.school_id = $${params.length}`;
    }

    let classJoin = '';
    if (class_id) {
      params.push(class_id);
      classJoin = `JOIN class_students cs ON cs.student_id = u.id AND cs.class_id = $${params.length} AND cs.active = true`;
    }

    let searchFilter = '';
    if (search) {
      params.push(`%${search}%`);
      searchFilter = `AND u.name ILIKE $${params.length}`;
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.whatsapp, u.active,
              sp.internal_enrollment, sp.birth_date,
              sp.mother_name, sp.mother_whatsapp,
              string_agg(DISTINCT c.full_name, ', ') AS classes
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       ${classJoin}
       LEFT JOIN class_students cs2 ON cs2.student_id = u.id AND cs2.active = true
       LEFT JOIN classes c ON c.id = cs2.class_id
       WHERE u.role = 'aluno' AND u.deleted_at IS NULL
         ${whereSchool} ${searchFilter}
       GROUP BY u.id, sp.internal_enrollment, sp.birth_date, sp.mother_name, sp.mother_whatsapp
       ORDER BY u.name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /alunos:', err);
    res.status(500).json({ message: 'Erro ao listar alunos.' });
  }
});

// ── POST /api/alunos/matricular ──────────────────────────────
router.post('/matricular', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { role: authRole, schoolId } = req.user!;
    const {
      name, email, cpf, whatsapp,
      rg, birth_date,
      address, address_number, address_complement, neighborhood, city, state, zip_code,
      internal_enrollment, sere_enrollment,
      mother_name, mother_email, mother_whatsapp,
      father_name, father_email, father_whatsapp,
      student_email, student_whatsapp,
      class_id, school_id,
    } = req.body;

    if (!name || !email || !cpf) {
      res.status(400).json({ message: 'Nome, e-mail e CPF são obrigatórios.' });
      return;
    }

    const targetSchool = authRole === 'super_admin' ? (school_id || schoolId) : schoolId;
    const cpfDigits = String(cpf).replace(/\D/g, '');

    // Gerar código de perfil
    const countRes = await query(
      `SELECT COUNT(*) AS cnt FROM users WHERE school_id = $1 AND role = 'aluno' AND deleted_at IS NULL`,
      [targetSchool]
    );
    const seq = String(Number(countRes.rows[0].cnt) + 1).padStart(3, '0');
    const year = new Date().getFullYear().toString().slice(-2);
    const profileCode = `ALU${year}${seq}`;
    const password = `${profileCode}@${cpfDigits.substring(0, 3)}`;
    const hash = await bcrypt.hash(password, 10);

    // Criar usuário
    const userRes = await query(
      `INSERT INTO users (school_id, name, email, password_hash, role, cpf, whatsapp, profile_code, active)
       VALUES ($1,$2,$3,$4,'aluno',$5,$6,$7,true) RETURNING id`,
      [targetSchool, name, email.toLowerCase().trim(), hash, cpfDigits || null, whatsapp || null, profileCode]
    );
    const userId = userRes.rows[0].id;

    // Criar perfil completo
    await query(
      `INSERT INTO student_profiles
         (user_id, school_id, full_name, cpf, rg, birth_date,
          address, address_number, address_complement, neighborhood, city, state, zip_code,
          internal_enrollment, sere_enrollment,
          mother_name, mother_email, mother_whatsapp,
          father_name, father_email, father_whatsapp,
          student_email, student_whatsapp, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,true)`,
      [
        userId, targetSchool, name,
        cpfDigits || null, rg || null, birth_date || null,
        address || null, address_number || null, address_complement || null,
        neighborhood || null, city || null, state || null, zip_code || null,
        internal_enrollment || null, sere_enrollment || null,
        mother_name || null, mother_email || null, mother_whatsapp || null,
        father_name || null, father_email || null, father_whatsapp || null,
        student_email || null, student_whatsapp || null,
      ]
    );

    // Vincular à turma
    if (class_id) {
      await query(
        `INSERT INTO class_students (class_id, student_id, active) VALUES ($1,$2,true) ON CONFLICT DO NOTHING`,
        [class_id, userId]
      );
    }

    res.status(201).json({ id: userId, profileCode, password, message: 'Aluno matriculado com sucesso.' });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ message: 'E-mail já cadastrado.' });
      return;
    }
    console.error('POST /alunos/matricular:', err);
    res.status(500).json({ message: 'Erro ao matricular aluno.' });
  }
});

// ── POST /api/alunos/import-bulk — importar alunos em lote ──
router.post('/import-bulk', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { role: authRole, schoolId } = req.user!;
    const { alunos: rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Nenhum aluno para importar.' });
    }

    type ImportResult = { row: number; name: string; success: boolean; error?: string };
    const results: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      const rowNum = i + 1;

      if (!s.name?.trim() || !s.email?.trim() || !s.cpf?.trim()) {
        results.push({ row: rowNum, name: s.name || `Linha ${rowNum}`, success: false, error: 'nome, email e cpf são obrigatórios.' });
        continue;
      }

      const targetSchool = authRole === 'super_admin' ? (s.school_id || schoolId) : schoolId;
      const cpfDigits = String(s.cpf).replace(/\D/g, '');

      try {
        const countRes = await query(
          `SELECT COUNT(*) AS cnt FROM users WHERE school_id = $1 AND role = 'aluno' AND deleted_at IS NULL`,
          [targetSchool]
        );
        const seq = String(Number(countRes.rows[0].cnt) + 1).padStart(3, '0');
        const year = new Date().getFullYear().toString().slice(-2);
        const profileCode = `ALU${year}${seq}`;
        const password = `${profileCode}@${cpfDigits.substring(0, 3)}`;
        const hash = await bcrypt.hash(password, 10);

        const userRes = await query(
          `INSERT INTO users (school_id, name, email, password_hash, role, cpf, whatsapp, profile_code, active)
           VALUES ($1,$2,$3,$4,'aluno',$5,$6,$7,true) RETURNING id`,
          [targetSchool, s.name.trim(), s.email.toLowerCase().trim(), hash, cpfDigits || null, s.whatsapp?.trim() || null, profileCode]
        );
        const userId = userRes.rows[0].id;

        await query(
          `INSERT INTO student_profiles
             (user_id, school_id, full_name, cpf, rg, birth_date,
              address, address_number, address_complement, neighborhood, city, state, zip_code,
              internal_enrollment, sere_enrollment,
              mother_name, mother_email, mother_whatsapp,
              father_name, father_email, father_whatsapp,
              student_email, student_whatsapp, active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,true)`,
          [
            userId, targetSchool, s.name.trim(),
            cpfDigits || null, s.rg || null, s.birth_date || null,
            s.address || null, s.address_number || null, s.address_complement || null,
            s.neighborhood || null, s.city || null, s.state || null, s.zip_code || null,
            s.internal_enrollment || null, s.sere_enrollment || null,
            s.mother_name || null, s.mother_email || null, s.mother_whatsapp || null,
            s.father_name || null, s.father_email || null, s.father_whatsapp || null,
            s.student_email || null, s.student_whatsapp || null,
          ]
        );

        if (s.class_id) {
          await query(
            `INSERT INTO class_students (class_id, student_id, active) VALUES ($1,$2,true) ON CONFLICT DO NOTHING`,
            [s.class_id, userId]
          );
        }

        results.push({ row: rowNum, name: s.name.trim(), success: true });
      } catch (err: any) {
        const msg = err.code === '23505' ? 'E-mail já cadastrado.' : 'Erro ao matricular aluno.';
        results.push({ row: rowNum, name: s.name || `Linha ${rowNum}`, success: false, error: msg });
      }
    }

    const successCount = results.filter(r => r.success).length;
    res.status(207).json({ results, successCount, totalCount: rows.length });
  } catch (err) {
    console.error('POST /alunos/import-bulk:', err);
    res.status(500).json({ message: 'Erro na importação de alunos.' });
  }
});

// ── GET /api/alunos/filho ────────────────────────────────────
// For `pais` role: returns the student whose mother/father email matches the parent's email
router.get('/filho', authorize('pais'), async (req: AuthRequest, res) => {
  try {
    const { email } = req.user!;
    const result = await query(
      `SELECT u.id, u.name, u.email,
              sp.internal_enrollment, sp.birth_date,
              string_agg(DISTINCT c.full_name, ', ') AS classes
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       LEFT JOIN class_students cs ON cs.student_id = u.id AND cs.active = true
       LEFT JOIN classes c ON c.id = cs.class_id
       WHERE sp.mother_email = $1 OR sp.father_email = $1
       GROUP BY u.id, u.name, u.email, sp.internal_enrollment, sp.birth_date`,
      [email]
    );
    if (!result.rows.length) {
      res.status(404).json({ message: 'Nenhum filho vinculado encontrado.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /alunos/filho:', err);
    res.status(500).json({ message: 'Erro ao buscar filho.' });
  }
});

// ── GET /api/alunos/:id/notas ────────────────────────────────
router.get('/:id/notas', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId } = req.user!;
    const targetId = role === 'aluno' ? userId : req.params.id;

    const result = await query(
      `SELECT g.bimester, g.score, g.recovery_score, g.final_score,
              sub.id AS subject_id, sub.name AS subject_name, sub.color AS subject_color,
              c.full_name AS class_name
       FROM grades g
       JOIN subjects sub ON sub.id = g.subject_id
       JOIN classes c ON c.id = g.class_id
       WHERE g.student_id = $1
       ORDER BY sub.name, g.bimester`,
      [targetId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /alunos/:id/notas:', err);
    res.status(500).json({ message: 'Erro ao buscar notas.' });
  }
});

// ── GET /api/alunos/:id/frequencia ───────────────────────────
router.get('/:id/frequencia', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId } = req.user!;
    const targetId = role === 'aluno' ? userId : req.params.id;

    const result = await query(
      `SELECT sub.id AS subject_id, sub.name AS subject_name, sub.color AS subject_color,
              COUNT(*) FILTER (WHERE ar.status = 'presente') AS presencas,
              COUNT(*) FILTER (WHERE ar.status = 'falta') AS faltas,
              COUNT(*) FILTER (WHERE ar.status = 'justificada') AS justificadas,
              COUNT(*) AS total,
              ROUND(COUNT(*) FILTER (WHERE ar.status = 'presente')::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS percentual
       FROM attendance_records ar
       JOIN attendance a ON a.id = ar.attendance_id
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE ar.student_id = $1
       GROUP BY sub.id, sub.name, sub.color
       ORDER BY sub.name`,
      [targetId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /alunos/:id/frequencia:', err);
    res.status(500).json({ message: 'Erro ao buscar frequência.' });
  }
});

// ── GET /api/alunos/:id/atividades ───────────────────────────
router.get('/:id/atividades', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId } = req.user!;
    const targetId = role === 'aluno' ? userId : req.params.id;

    const result = await query(
      `SELECT a.id, a.title, a.activity_type, a.bimester,
              sub.name AS subject_name, sub.color AS subject_color,
              ar.status, ar.final_score, ar.finished_at
       FROM activities a
       JOIN subjects sub ON sub.id = a.subject_id
       LEFT JOIN activity_results ar ON ar.activity_id = a.id AND ar.student_id = $1
       WHERE a.class_id IN (
         SELECT class_id FROM class_students WHERE student_id = $1 AND active = true
       ) AND a.published = true
       ORDER BY a.available_from DESC NULLS LAST, a.created_at DESC`,
      [targetId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /alunos/:id/atividades:', err);
    res.status(500).json({ message: 'Erro ao buscar atividades.' });
  }
});

export default router;
