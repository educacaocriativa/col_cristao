import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/coins - saldo + histórico de transações
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;

    const balance = await query(
      `SELECT balance, total_earned FROM student_coins WHERE user_id = $1`,
      [userId]
    );

    const transactions = await query(
      `SELECT id, amount, reason, description, created_at
       FROM coin_transactions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    res.json({
      balance: balance.rows[0]?.balance ?? 0,
      totalEarned: balance.rows[0]?.total_earned ?? 0,
      transactions: transactions.rows,
    });
  } catch (err) {
    console.error('GET /coins:', err);
    res.status(500).json({ message: 'Erro ao buscar moedas.' });
  }
});

// GET /api/coins/ranking - ranking de alunos (por escola)
router.get('/ranking', async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.user!;
    const result = await query(
      `SELECT u.id, u.name, sc.balance, sc.total_earned
       FROM student_coins sc
       JOIN users u ON u.id = sc.user_id
       WHERE u.school_id = $1 AND u.role = 'aluno'
       ORDER BY sc.total_earned DESC LIMIT 20`,
      [schoolId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /coins/ranking:', err);
    res.status(500).json({ message: 'Erro ao buscar ranking.' });
  }
});

export default router;
