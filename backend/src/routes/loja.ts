import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/loja - listar produtos ativos
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.user!;
    const result = await query(
      `SELECT id, name, description, image_emoji, coin_price, stock, active, created_at
       FROM store_products
       WHERE (school_id = $1 OR school_id IS NULL) AND active = true
       ORDER BY coin_price ASC`,
      [schoolId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /loja:', err);
    res.status(500).json({ message: 'Erro ao listar produtos.' });
  }
});

// POST /api/loja - admin cria produto
router.post('/', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.user!;
    const { name, description, image_emoji, coin_price, stock } = req.body;
    const result = await query(
      `INSERT INTO store_products (school_id, name, description, image_emoji, coin_price, stock)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [schoolId, name, description || null, image_emoji || '🎁', coin_price, stock || null]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /loja:', err);
    res.status(500).json({ message: 'Erro ao criar produto.' });
  }
});

// PUT /api/loja/:id
router.put('/:id', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { name, description, image_emoji, coin_price, stock, active } = req.body;
    await query(
      `UPDATE store_products SET name=$1, description=$2, image_emoji=$3, coin_price=$4, stock=$5, active=$6, updated_at=NOW()
       WHERE id=$7`,
      [name, description || null, image_emoji || '🎁', coin_price, stock || null, active ?? true, req.params.id]
    );
    res.json({ message: 'Produto atualizado.' });
  } catch (err) {
    console.error('PUT /loja/:id:', err);
    res.status(500).json({ message: 'Erro ao atualizar produto.' });
  }
});

// DELETE /api/loja/:id
router.delete('/:id', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`UPDATE store_products SET active = false WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Produto removido.' });
  } catch (err) {
    console.error('DELETE /loja/:id:', err);
    res.status(500).json({ message: 'Erro ao remover produto.' });
  }
});

// POST /api/loja/:id/comprar - aluno compra produto
router.post('/:id/comprar', authorize('aluno'), async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const { id: productId } = req.params;

    const product = await query(
      `SELECT id, name, coin_price, stock FROM store_products WHERE id = $1 AND active = true`,
      [productId]
    );
    if (!product.rows.length) {
      res.status(404).json({ message: 'Produto não encontrado.' });
      return;
    }

    const { name, coin_price, stock } = product.rows[0];

    // Check stock
    if (stock !== null && Number(stock) <= 0) {
      res.status(400).json({ message: 'Produto sem estoque.' });
      return;
    }

    // Check balance
    const coins = await query(`SELECT balance FROM student_coins WHERE user_id = $1`, [userId]);
    const balance = Number(coins.rows[0]?.balance ?? 0);
    if (balance < coin_price) {
      res.status(400).json({ message: 'Saldo insuficiente de Estelares.' });
      return;
    }

    // Deduct coins
    await query(
      `UPDATE student_coins SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2`,
      [coin_price, userId]
    );
    await query(
      `INSERT INTO coin_transactions (user_id, amount, reason, reference_id, description)
       VALUES ($1, $2, 'purchase', $3, $4)`,
      [userId, -coin_price, productId, `Compra: ${name}`]
    );

    // Record purchase
    await query(
      `INSERT INTO store_purchases (product_id, student_id, coins_spent) VALUES ($1,$2,$3)`,
      [productId, userId, coin_price]
    );

    // Decrement stock if finite
    if (stock !== null) {
      await query(`UPDATE store_products SET stock = stock - 1 WHERE id = $1`, [productId]);
    }

    res.json({ message: `${name} adquirido com sucesso!`, coinsSpent: coin_price });
  } catch (err) {
    console.error('POST /loja/:id/comprar:', err);
    res.status(500).json({ message: 'Erro ao realizar compra.' });
  }
});

// GET /api/loja/compras - histórico de compras do aluno
router.get('/compras', authorize('aluno'), async (req: AuthRequest, res) => {
  try {
    const { id: userId } = req.user!;
    const result = await query(
      `SELECT sp.id, sp.coins_spent, sp.status, sp.purchased_at,
              p.name, p.image_emoji
       FROM store_purchases sp
       JOIN store_products p ON p.id = sp.product_id
       WHERE sp.student_id = $1
       ORDER BY sp.purchased_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /loja/compras:', err);
    res.status(500).json({ message: 'Erro ao buscar compras.' });
  }
});

// GET /api/loja/admin/compras - admin vê todas as compras pendentes
router.get('/admin/compras', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.user!;
    const result = await query(
      `SELECT sp.id, sp.coins_spent, sp.status, sp.purchased_at,
              p.name, p.image_emoji,
              u.name AS student_name
       FROM store_purchases sp
       JOIN store_products p ON p.id = sp.product_id
       JOIN users u ON u.id = sp.student_id
       WHERE u.school_id = $1
       ORDER BY sp.purchased_at DESC`,
      [schoolId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /loja/admin/compras:', err);
    res.status(500).json({ message: 'Erro ao buscar compras.' });
  }
});

// PUT /api/loja/admin/compras/:id/entregar - admin marca como entregue
router.put('/admin/compras/:id/entregar', authorize('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`UPDATE store_purchases SET status = 'delivered' WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Compra marcada como entregue.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro.' });
  }
});

export default router;
