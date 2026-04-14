import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Helper interno para dar moedas
async function awardCoins(userId: string, amount: number, reason: string, refId?: string, description?: string) {
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

// ── GET /api/trilhas ─────────────────────────────────────────
// ?mode=formacao → trilhas de formação de professores
// sem param     → trilhas de alunos (comportamento original)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId, schoolId } = req.user!;
    const mode = req.query.mode as string;
    let sql: string;
    let params: unknown[];

    if (mode === 'formacao') {
      // Trilhas de formação de professores
      if (role === 'professor') {
        // Professor vê trilhas publicadas da sua escola (criadas por admin/super_admin)
        sql = `
          SELECT t.id, t.title, t.description, t.published,
                 COUNT(DISTINCT ts.id) AS step_count,
                 COUNT(DISTINCT tsc.id) FILTER (WHERE tsc.student_id = $2) AS completed_steps,
                 t.created_at
          FROM learning_trails t
          LEFT JOIN trail_steps ts ON ts.trail_id = t.id
          LEFT JOIN trail_step_completions tsc ON tsc.trail_id = t.id AND tsc.student_id = $2
          WHERE t.school_id = $1 AND t.target_role = 'professor' AND t.published = true
          GROUP BY t.id
          ORDER BY t.created_at DESC`;
        params = [schoolId, userId];
      } else {
        // admin / super_admin: vê todas as trilhas de formação para gerenciar
        if (role === 'super_admin') {
          sql = `
            SELECT t.id, t.title, t.description, t.published,
                   COUNT(ts.id) AS step_count, t.created_at,
                   u.name AS creator_name, s.name AS school_name
            FROM learning_trails t
            LEFT JOIN trail_steps ts ON ts.trail_id = t.id
            JOIN users u ON u.id = t.creator_id
            JOIN schools s ON s.id = t.school_id
            WHERE t.target_role = 'professor'
            GROUP BY t.id, u.name, s.name
            ORDER BY t.created_at DESC`;
          params = [];
        } else {
          sql = `
            SELECT t.id, t.title, t.description, t.published,
                   COUNT(ts.id) AS step_count, t.created_at,
                   u.name AS creator_name
            FROM learning_trails t
            LEFT JOIN trail_steps ts ON ts.trail_id = t.id
            JOIN users u ON u.id = t.creator_id
            WHERE t.target_role = 'professor' AND t.school_id = $1
            GROUP BY t.id, u.name
            ORDER BY t.created_at DESC`;
          params = [schoolId];
        }
      }
    } else if (role === 'professor') {
      // Trilhas criadas pelo professor para seus alunos
      sql = `
        SELECT t.id, t.title, t.description, t.bimester, t.published,
               sub.id AS subject_id, sub.name AS subject_name, sub.color AS subject_color, sub.icon AS subject_icon,
               c.full_name AS class_name,
               COUNT(ts.id) AS step_count,
               t.created_at
        FROM learning_trails t
        LEFT JOIN subjects sub ON sub.id = t.subject_id
        LEFT JOIN classes c ON c.id = t.class_id
        LEFT JOIN trail_steps ts ON ts.trail_id = t.id
        WHERE t.creator_id = $1 AND t.target_role = 'aluno'
        GROUP BY t.id, sub.id, sub.name, sub.color, sub.icon, c.full_name
        ORDER BY t.created_at DESC`;
      params = [userId];
    } else {
      // aluno: trilhas da sua turma (publicadas)
      sql = `
        SELECT t.id, t.title, t.description, t.bimester, t.published,
               sub.id AS subject_id, sub.name AS subject_name, sub.color AS subject_color, sub.icon AS subject_icon,
               c.full_name AS class_name,
               COUNT(DISTINCT ts.id) AS step_count,
               COUNT(DISTINCT tsc.id) AS completed_steps,
               t.created_at
        FROM learning_trails t
        LEFT JOIN subjects sub ON sub.id = t.subject_id
        LEFT JOIN classes c ON c.id = t.class_id
        LEFT JOIN trail_steps ts ON ts.trail_id = t.id
        LEFT JOIN trail_step_completions tsc ON tsc.trail_id = t.id AND tsc.student_id = $1
        WHERE t.class_id IN (
          SELECT class_id FROM class_students WHERE student_id = $1 AND active = true
        ) AND t.published = true AND t.target_role = 'aluno'
        GROUP BY t.id, sub.id, sub.name, sub.color, sub.icon, c.full_name
        ORDER BY t.created_at DESC`;
      params = [userId];
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /trilhas:', err);
    res.status(500).json({ message: 'Erro ao listar trilhas.' });
  }
});

// ── GET /api/trilhas/:id ─────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const { id } = req.params;

    const trail = await query(
      `SELECT t.id, t.title, t.description, t.bimester, t.published, t.target_role,
              t.creator_id, u.name AS creator_name,
              sub.id AS subject_id, sub.name AS subject_name, sub.color AS subject_color, sub.icon AS subject_icon,
              c.id AS class_id, c.full_name AS class_name
       FROM learning_trails t
       LEFT JOIN subjects sub ON sub.id = t.subject_id
       LEFT JOIN classes c ON c.id = t.class_id
       JOIN users u ON u.id = t.creator_id
       WHERE t.id = $1`,
      [id]
    );

    if (!trail.rows.length) {
      res.status(404).json({ message: 'Trilha não encontrada.' });
      return;
    }

    const steps = await query(
      `SELECT ts.id, ts.step_order, ts.step_type, ts.title, ts.description,
              ts.vimeo_id, ts.file_url, ts.content, ts.activity_id, ts.coins_reward, ts.required,
              CASE WHEN tsc.id IS NOT NULL THEN true ELSE false END AS completed,
              tsc.completed_at
       FROM trail_steps ts
       LEFT JOIN trail_step_completions tsc ON tsc.step_id = ts.id AND tsc.student_id = $2
       WHERE ts.trail_id = $1
       ORDER BY ts.step_order`,
      [id, userId]
    );

    res.json({ ...trail.rows[0], steps: steps.rows });
  } catch (err) {
    console.error('GET /trilhas/:id:', err);
    res.status(500).json({ message: 'Erro ao buscar trilha.' });
  }
});

// ── POST /api/trilhas ────────────────────────────────────────
// target_role='professor' → apenas admin/super_admin podem criar
router.post('/', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id: creatorId, schoolId, role } = req.user!;
    const { title, description, subject_id, class_id, bimester, target_role } = req.body;

    if (target_role === 'professor' && role === 'professor') {
      res.status(403).json({ message: 'Apenas administradores podem criar trilhas de formação.' });
      return;
    }

    const result = await query(
      `INSERT INTO learning_trails (school_id, class_id, subject_id, creator_id, title, description, bimester, target_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [schoolId, class_id || null, subject_id || null, creatorId, title, description || null, bimester || null, target_role || 'aluno']
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /trilhas:', err);
    res.status(500).json({ message: 'Erro ao criar trilha.' });
  }
});

// ── PUT /api/trilhas/:id ─────────────────────────────────────
router.put('/:id', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { title, description, bimester, published } = req.body;
    await query(
      `UPDATE learning_trails SET title=$1, description=$2, bimester=$3, published=$4, updated_at=NOW() WHERE id=$5`,
      [title, description || null, bimester || null, published ?? false, req.params.id]
    );
    res.json({ message: 'Trilha atualizada.' });
  } catch (err) {
    console.error('PUT /trilhas/:id:', err);
    res.status(500).json({ message: 'Erro ao atualizar trilha.' });
  }
});

// ── DELETE /api/trilhas/:id ──────────────────────────────────
router.delete('/:id', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM learning_trails WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Trilha removida.' });
  } catch (err) {
    console.error('DELETE /trilhas/:id:', err);
    res.status(500).json({ message: 'Erro ao remover trilha.' });
  }
});

// ── POST /api/trilhas/:id/steps ──────────────────────────────
router.post('/:id/steps', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { id: trailId } = req.params;
    const { step_type, title, description, vimeo_id, file_url, content, activity_id, coins_reward, required } = req.body;

    const maxOrder = await query(
      `SELECT COALESCE(MAX(step_order), 0) AS max_order FROM trail_steps WHERE trail_id = $1`,
      [trailId]
    );
    const nextOrder = Number(maxOrder.rows[0].max_order) + 1;

    const result = await query(
      `INSERT INTO trail_steps (trail_id, step_order, step_type, title, description, vimeo_id, file_url, content, activity_id, coins_reward, required)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [trailId, nextOrder, step_type, title, description || null,
       vimeo_id || null, file_url || null, content || null,
       activity_id || null, coins_reward ?? 10, required ?? true]
    );
    res.status(201).json({ id: result.rows[0].id, step_order: nextOrder });
  } catch (err) {
    console.error('POST /trilhas/:id/steps:', err);
    res.status(500).json({ message: 'Erro ao adicionar etapa.' });
  }
});

// ── PUT /api/trilhas/:id/steps/:stepId ──────────────────────
router.put('/:id/steps/:stepId', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { title, description, vimeo_id, file_url, content, coins_reward, required, activity_id } = req.body;
    await query(
      `UPDATE trail_steps SET title=$1, description=$2, vimeo_id=$3, file_url=$4, content=$5, coins_reward=$6, required=$7, activity_id=$8
       WHERE id=$9`,
      [title, description || null, vimeo_id || null, file_url || null, content || null, coins_reward ?? 10, required ?? true, activity_id || null, req.params.stepId]
    );
    res.json({ message: 'Etapa atualizada.' });
  } catch (err) {
    console.error('PUT /trilhas/:id/steps/:stepId:', err);
    res.status(500).json({ message: 'Erro ao atualizar etapa.' });
  }
});

// ── DELETE /api/trilhas/:id/steps/:stepId ───────────────────
router.delete('/:id/steps/:stepId', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM trail_steps WHERE id = $1`, [req.params.stepId]);
    res.json({ message: 'Etapa removida.' });
  } catch (err) {
    console.error('DELETE /trilhas/:id/steps/:stepId:', err);
    res.status(500).json({ message: 'Erro ao remover etapa.' });
  }
});

// ── POST /api/trilhas/:id/steps/:stepId/completar ───────────
// Aluno completa etapa de trilha (aluno) OU professor completa etapa de formação
router.post('/:id/steps/:stepId/completar', authorize('aluno', 'professor'), async (req: AuthRequest, res) => {
  try {
    const { role, id: userId } = req.user!;
    const trailId = req.params.id as string;
    const stepId = req.params.stepId as string;

    // Professor só pode completar trilhas de formação (target_role='professor')
    if (role === 'professor') {
      const trailCheck = await query(
        `SELECT target_role FROM learning_trails WHERE id = $1`,
        [trailId]
      );
      if (trailCheck.rows[0]?.target_role !== 'professor') {
        res.status(403).json({ message: 'Professor só pode completar trilhas de formação.' });
        return;
      }
    }

    // Verificar se já completou
    const exists = await query(
      `SELECT id FROM trail_step_completions WHERE step_id = $1 AND student_id = $2`,
      [stepId, userId]
    );
    if (exists.rows.length) {
      res.json({ message: 'Etapa já concluída.', alreadyCompleted: true, coinsAwarded: 0 });
      return;
    }

    const step = await query(`SELECT coins_reward, title FROM trail_steps WHERE id = $1`, [stepId]);
    if (!step.rows.length) {
      res.status(404).json({ message: 'Etapa não encontrada.' });
      return;
    }

    const { coins_reward, title } = step.rows[0];

    await query(
      `INSERT INTO trail_step_completions (trail_id, step_id, student_id) VALUES ($1,$2,$3)`,
      [trailId, stepId, userId]
    );

    if (coins_reward > 0) {
      await awardCoins(userId, coins_reward, 'trail_step', stepId, `Etapa concluída: ${title}`);
    }

    res.json({ message: 'Etapa concluída!', coinsAwarded: coins_reward });
  } catch (err) {
    console.error('POST /trilhas/:id/steps/:stepId/completar:', err);
    res.status(500).json({ message: 'Erro ao completar etapa.' });
  }
});

export default router;
