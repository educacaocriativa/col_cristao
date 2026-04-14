import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── Helper: award coins ───────────────────────────────────────
async function awardCoins(userId: string, amount: number, reason: string, refId?: string, description?: string) {
  if (amount <= 0) return;
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

// ── GET /api/atividades ──────────────────────────────────────
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { role, id: userId, schoolId } = req.user!;
    const { class_id, subject_id, bimester, published } = req.query;

    let sql = `
      SELECT a.id, a.title, a.activity_type, a.bimester, a.published,
             a.time_limit_minutes, a.available_from, a.available_until,
             a.max_score, a.created_at,
             sub.name AS subject_name, sub.color AS subject_color,
             c.full_name AS class_name,
             u.name AS creator_name,
             COUNT(aq.id) AS question_count
      FROM activities a
      JOIN subjects sub ON sub.id = a.subject_id
      LEFT JOIN classes c ON c.id = a.class_id
      JOIN users u ON u.id = a.creator_id
      LEFT JOIN activity_questions aq ON aq.activity_id = a.id
      WHERE a.school_id = $1`;
    const params: unknown[] = [role === 'super_admin' ? null : schoolId];

    if (role === 'professor') {
      sql = sql.replace('WHERE a.school_id = $1', `WHERE a.creator_id = $1`);
      params[0] = userId;
    }
    if (role === 'aluno') {
      sql = sql.replace('WHERE a.school_id = $1', `
        WHERE a.class_id IN (SELECT class_id FROM class_students WHERE student_id = $1 AND active = true)
        AND a.published = true`);
      params[0] = userId;
    }

    if (class_id) { params.push(class_id); sql += ` AND a.class_id = $${params.length}`; }
    if (subject_id) { params.push(subject_id); sql += ` AND a.subject_id = $${params.length}`; }
    if (bimester) { params.push(bimester); sql += ` AND a.bimester = $${params.length}`; }
    if (published !== undefined) { params.push(published === 'true'); sql += ` AND a.published = $${params.length}`; }

    sql += ' GROUP BY a.id, sub.name, sub.color, c.full_name, u.name ORDER BY a.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /atividades:', err);
    res.status(500).json({ message: 'Erro ao listar atividades.' });
  }
});

// ── GET /api/atividades/:id ──────────────────────────────────
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user!;

    const ativ = await query(
      `SELECT a.*, sub.name AS subject_name, sub.color AS subject_color,
              c.full_name AS class_name, u.name AS creator_name
       FROM activities a
       JOIN subjects sub ON sub.id = a.subject_id
       LEFT JOIN classes c ON c.id = a.class_id
       JOIN users u ON u.id = a.creator_id
       WHERE a.id = $1`,
      [id]
    );

    if (!ativ.rows.length) { res.status(404).json({ message: 'Atividade não encontrada.' }); return; }

    const questions = await query(
      `SELECT q.id, q.question_type, q.difficulty, q.bloom_level, q.command, q.context,
              q.media_urls, q.tri_difficulty, q.tri_discrimination, q.tri_guessing,
              aq.order_index, aq.score,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', qa.id, 'label', qa.label, 'text', qa.text,
                    'is_correct', CASE WHEN $2::text = 'aluno' THEN false ELSE qa.is_correct END,
                    'partial_score', qa.partial_score, 'order_index', qa.order_index
                  ) ORDER BY qa.order_index
                ) FILTER (WHERE qa.id IS NOT NULL), '[]'
              ) AS alternatives
       FROM activity_questions aq
       JOIN questions q ON q.id = aq.question_id
       LEFT JOIN question_alternatives qa ON qa.question_id = q.id
       WHERE aq.activity_id = $1
       GROUP BY q.id, aq.order_index, aq.score
       ORDER BY aq.order_index`,
      [id, role]
    );

    // For student: get their previous result if any
    let studentResult = null;
    if (role === 'aluno') {
      const sr = await query(
        `SELECT status, final_score, finished_at FROM activity_results
         WHERE activity_id = $1 AND student_id = $2`,
        [id, userId]
      );
      if (sr.rows.length) studentResult = sr.rows[0];
    }

    res.json({ ...ativ.rows[0], questions: questions.rows, studentResult });
  } catch (err) {
    console.error('GET /atividades/:id:', err);
    res.status(500).json({ message: 'Erro ao buscar atividade.' });
  }
});

// ── POST /api/atividades ─────────────────────────────────────
router.post('/', authorize('professor', 'admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolId, id: creatorId } = req.user!;
    const {
      title, activity_type, subject_id, class_id, bimester,
      time_limit_minutes, available_from, available_until,
      max_score, instructions, use_tri, published, coins_reward,
      questions: questionList,
    } = req.body;

    const actResult = await query(
      `INSERT INTO activities (school_id, class_id, subject_id, creator_id, title, description,
        activity_type, bimester, max_score, coins_reward, time_limit_minutes, available_from, available_until,
        use_tri, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [schoolId, class_id || null, subject_id, creatorId, title, instructions || null,
       activity_type, bimester || null, max_score || 100, coins_reward ?? 0, time_limit_minutes || null,
       available_from || null, available_until || null, use_tri ?? true, published ?? false]
    );

    const activityId = actResult.rows[0].id;

    // Insert questions
    if (questionList?.length) {
      for (let i = 0; i < questionList.length; i++) {
        const q = questionList[i];
        // Insert question
        const qResult = await query(
          `INSERT INTO questions (school_id, creator_id, subject_id, question_type, difficulty,
            bloom_level, context, command, tri_difficulty, tri_discrimination, tri_guessing)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [schoolId, creatorId, subject_id, q.type, q.difficulty || 'medio',
           q.bloom || null, q.context || null, q.command,
           q.tri_difficulty || null, q.tri_discrimination || null, q.tri_guessing || null]
        );
        const questionId = qResult.rows[0].id;

        // Insert alternatives
        if (q.alternatives?.length) {
          for (const alt of q.alternatives) {
            await query(
              `INSERT INTO question_alternatives (question_id, label, text, is_correct, partial_score, order_index)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [questionId, alt.label, alt.text, alt.is_correct ?? false, alt.partial_score ?? 0, alt.order_index ?? 0]
            );
          }
        }

        // Link to activity
        await query(
          `INSERT INTO activity_questions (activity_id, question_id, order_index, score)
           VALUES ($1,$2,$3,$4)`,
          [activityId, questionId, i, q.score || 1]
        );
      }
    }

    res.status(201).json({ id: activityId, message: 'Atividade criada com sucesso.' });
  } catch (err) {
    console.error('POST /atividades:', err);
    res.status(500).json({ message: 'Erro ao criar atividade.' });
  }
});

// ── POST /api/atividades/:id/submeter ────────────────────────
router.post('/:id/submeter', authorize('aluno'), async (req: AuthRequest, res) => {
  try {
    const activityId = req.params.id as string;
    const { id: studentId } = req.user!;
    const { responses, started_at } = req.body;
    // responses: [{ question_id, alternative_id?, text_response? }]

    // Check activity exists and is published
    const actCheck = await query(
      `SELECT id, max_score, coins_reward, use_tri, title FROM activities WHERE id = $1 AND published = true`,
      [activityId]
    );
    if (!actCheck.rows.length) { res.status(404).json({ message: 'Atividade não disponível.' }); return; }

    // Upsert result header
    await query(
      `INSERT INTO activity_results (activity_id, student_id, started_at, status)
       VALUES ($1,$2,$3,'in_progress')
       ON CONFLICT (activity_id, student_id) DO NOTHING`,
      [activityId, studentId, started_at || new Date()]
    );

    let totalScore = 0;
    let maxPossible = 0;

    for (const resp of responses as { question_id: string; alternative_id?: string; text_response?: string }[]) {
      // Get correct alternative
      const altInfo = resp.alternative_id
        ? await query(
            `SELECT is_correct, partial_score FROM question_alternatives WHERE id = $1`,
            [resp.alternative_id]
          )
        : null;

      const isCorrect = altInfo?.rows[0]?.is_correct ?? false;
      const rawScore = altInfo?.rows[0]?.partial_score ?? (isCorrect ? 1 : 0);
      const aqScore = await query(
        `SELECT score FROM activity_questions WHERE activity_id = $1 AND question_id = $2`,
        [activityId, resp.question_id]
      );
      const qScore = aqScore.rows[0]?.score ?? 1;
      maxPossible += qScore;
      totalScore += rawScore * qScore;

      await query(
        `INSERT INTO student_responses (activity_id, student_id, question_id, alternative_id, text_response, is_correct, raw_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (activity_id, student_id, question_id)
         DO UPDATE SET alternative_id = EXCLUDED.alternative_id, is_correct = EXCLUDED.is_correct, raw_score = EXCLUDED.raw_score`,
        [activityId, studentId, resp.question_id, resp.alternative_id || null, resp.text_response || null, isCorrect, rawScore]
      );
    }

    const finalScore = maxPossible > 0 ? (totalScore / maxPossible) * (actCheck.rows[0].max_score || 100) : 0;

    await query(
      `UPDATE activity_results SET status='completed', finished_at=NOW(), final_score=$1, raw_score=$2
       WHERE activity_id=$3 AND student_id=$4`,
      [Math.round(finalScore * 10) / 10, totalScore, activityId, studentId]
    );

    // Award coins if configured
    const coinsReward = actCheck.rows[0].coins_reward ?? 0;
    if (coinsReward > 0) {
      await awardCoins(studentId, coinsReward, 'activity', activityId, `Expedição concluída: ${actCheck.rows[0].title}`);
    }

    res.json({ finalScore: Math.round(finalScore * 10) / 10, coinsAwarded: coinsReward, message: 'Atividade enviada com sucesso!' });
  } catch (err) {
    console.error('POST /atividades/:id/submeter:', err);
    res.status(500).json({ message: 'Erro ao submeter atividade.' });
  }
});

// ── DELETE /api/atividades/:id ───────────────────────────────
router.delete('/:id', authorize('professor', 'admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM activities WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Atividade removida.' });
  } catch (err) {
    console.error('DELETE /atividades/:id:', err);
    res.status(500).json({ message: 'Erro ao remover atividade.' });
  }
});

export default router;
