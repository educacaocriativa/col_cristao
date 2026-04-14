import { Router } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── GET /api/calendar?month=&year= ──────────────────────────
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { schoolId } = req.user!;
    const { month, year } = req.query;

    let dateFilter = '';
    const params: unknown[] = [schoolId];

    if (month && year) {
      params.push(`${year}-${String(month).padStart(2, '0')}-01`);
      params.push(`${year}-${String(month).padStart(2, '0')}-31`);
      dateFilter = `AND DATE(ce.start_datetime) BETWEEN $2 AND $3`;
    } else if (year) {
      params.push(`${year}-01-01`);
      params.push(`${year}-12-31`);
      dateFilter = `AND DATE(ce.start_datetime) BETWEEN $2 AND $3`;
    }

    const result = await query(
      `SELECT ce.id, ce.title, ce.description, ce.event_type, ce.start_datetime,
              ce.end_datetime, ce.all_day, ce.color, ce.class_id,
              c.full_name AS class_name, u.name AS creator_name
       FROM calendar_events ce
       JOIN users u ON u.id = ce.creator_id
       LEFT JOIN classes c ON c.id = ce.class_id
       WHERE ce.school_id = $1 ${dateFilter}
       ORDER BY ce.start_datetime`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /calendar:', err);
    res.status(500).json({ message: 'Erro ao buscar calendário.' });
  }
});

// ── POST /api/calendar ───────────────────────────────────────
router.post('/', authorize('admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { schoolId, id: creatorId } = req.user!;
    const { title, description, event_type, start_datetime, end_datetime, all_day, color, class_id } = req.body;

    const result = await query(
      `INSERT INTO calendar_events (school_id, class_id, creator_id, title, description, event_type, start_datetime, end_datetime, all_day, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [schoolId, class_id || null, creatorId, title, description || null, event_type || 'evento',
       start_datetime, end_datetime || null, all_day ?? false, color || null]
    );

    res.status(201).json({ id: result.rows[0].id, message: 'Evento criado.' });
  } catch (err) {
    console.error('POST /calendar:', err);
    res.status(500).json({ message: 'Erro ao criar evento.' });
  }
});

// ── DELETE /api/calendar/:id ─────────────────────────────────
router.delete('/:id', authorize('admin', 'pedagogico', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    await query(`DELETE FROM calendar_events WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Evento removido.' });
  } catch (err) {
    console.error('DELETE /calendar/:id:', err);
    res.status(500).json({ message: 'Erro ao remover evento.' });
  }
});

export default router;
