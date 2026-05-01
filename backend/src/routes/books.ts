import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Storage ──────────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(process.env.UPLOADS_DIR || './uploads', 'books');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.pdf';
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Apenas arquivos PDF são aceitos.'));
    }
    cb(null, true);
  },
});

// ── Helpers ──────────────────────────────────────────────────────
function parseIdList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fallback CSV
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function toBool(raw: unknown): boolean {
  return raw === true || raw === 'true' || raw === '1' || raw === 1;
}

async function loadBookWithLinks(bookId: string) {
  const bookRes = await query(
    `SELECT id, name, file_path, file_size, mime_type, for_aluno, for_professor, created_at
       FROM books WHERE id = $1 AND deleted_at IS NULL`,
    [bookId]
  );
  if (bookRes.rows.length === 0) return null;
  const book = bookRes.rows[0];

  const schoolsRes = await query(
    `SELECT s.id, s.name FROM book_schools bs
       JOIN schools s ON s.id = bs.school_id
      WHERE bs.book_id = $1 AND s.deleted_at IS NULL
      ORDER BY s.name`,
    [bookId]
  );
  const gradesRes = await query(
    `SELECT g.id, g.name, g.order_index FROM book_grade_levels bg
       JOIN grade_levels g ON g.id = bg.grade_level_id
      WHERE bg.book_id = $1
      ORDER BY g.order_index`,
    [bookId]
  );
  return { ...book, schools: schoolsRes.rows, grade_levels: gradesRes.rows };
}

// ── POST / — cadastra livro (super_admin) ───────────────────────
router.post(
  '/',
  authenticate,
  authorize('super_admin'),
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      const { name } = req.body;
      const schoolIds = parseIdList(req.body.school_ids);
      const gradeIds  = parseIdList(req.body.grade_level_ids);
      const forAluno     = toBool(req.body.for_aluno);
      const forProfessor = toBool(req.body.for_professor);

      const missing: string[] = [];
      if (!name?.trim())          missing.push('nome');
      if (!file)                  missing.push('arquivo PDF');
      if (schoolIds.length === 0) missing.push('ao menos uma unidade');
      if (gradeIds.length === 0)  missing.push('ao menos um ano escolar');
      if (!forAluno && !forProfessor) missing.push('alvo (aluno e/ou professor)');

      if (missing.length > 0) {
        if (file) fs.unlink(file.path, () => {});
        return res.status(400).json({ message: `Campos obrigatórios: ${missing.join(', ')}.` });
      }

      const bookRes = await query(
        `INSERT INTO books (name, file_path, file_size, mime_type, for_aluno, for_professor, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          name.trim(),
          path.basename(file!.path),
          file!.size,
          file!.mimetype,
          forAluno,
          forProfessor,
          req.user?.id ?? null,
        ]
      );
      const bookId = bookRes.rows[0].id;

      for (const sid of schoolIds) {
        await query(
          `INSERT INTO book_schools (book_id, school_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [bookId, sid]
        );
      }
      for (const gid of gradeIds) {
        await query(
          `INSERT INTO book_grade_levels (book_id, grade_level_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [bookId, gid]
        );
      }

      const full = await loadBookWithLinks(bookId);
      res.status(201).json(full);
    } catch (err: any) {
      console.error('POST /books:', err);
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ message: err.message || 'Erro ao cadastrar livro.' });
    }
  }
);

// ── GET / — lista livros visíveis para o usuário ────────────────
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u = req.user!;
    const role = u.role;
    const schoolId = u.schoolId;

    const conditions: string[] = ['b.deleted_at IS NULL'];
    const params: unknown[] = [];

    if (role === 'super_admin') {
      // vê tudo
    } else if (role === 'admin' || role === 'pedagogico') {
      if (!schoolId) return res.json([]);
      params.push(schoolId);
      conditions.push(`EXISTS (SELECT 1 FROM book_schools bs WHERE bs.book_id = b.id AND bs.school_id = $${params.length})`);
    } else if (role === 'professor') {
      if (!schoolId) return res.json([]);
      params.push(schoolId);
      conditions.push(`EXISTS (SELECT 1 FROM book_schools bs WHERE bs.book_id = b.id AND bs.school_id = $${params.length})`);
      conditions.push('b.for_professor = true');
    } else if (role === 'aluno') {
      if (!schoolId) return res.json([]);
      params.push(schoolId);
      conditions.push(`EXISTS (SELECT 1 FROM book_schools bs WHERE bs.book_id = b.id AND bs.school_id = $${params.length})`);
      conditions.push('b.for_aluno = true');
      params.push(u.id);
      // filtra pelos anos das turmas do aluno
      conditions.push(`EXISTS (
        SELECT 1 FROM book_grade_levels bg
          JOIN classes c ON c.grade_level_id = bg.grade_level_id
          JOIN class_students cs ON cs.class_id = c.id
         WHERE bg.book_id = b.id AND cs.student_id = $${params.length} AND cs.active = true
      )`);
    } else {
      return res.json([]);
    }

    const result = await query(
      `SELECT b.id, b.name, b.file_size, b.for_aluno, b.for_professor, b.created_at,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name)) FILTER (WHERE s.id IS NOT NULL), '[]') AS schools,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name, 'order_index', g.order_index)) FILTER (WHERE g.id IS NOT NULL), '[]') AS grade_levels
         FROM books b
         LEFT JOIN book_schools bs       ON bs.book_id = b.id
         LEFT JOIN schools s             ON s.id = bs.school_id AND s.deleted_at IS NULL
         LEFT JOIN book_grade_levels bg  ON bg.book_id = b.id
         LEFT JOIN grade_levels g        ON g.id = bg.grade_level_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY b.id
        ORDER BY b.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /books:', err);
    res.status(500).json({ message: 'Erro ao listar livros.' });
  }
});

// ── GET /:id/file — stream do PDF ───────────────────────────────
router.get('/:id/file', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT file_path, mime_type, name FROM books WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Livro não encontrado.' });
    }
    const { file_path, mime_type, name } = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Arquivo do livro não encontrado.' });
    }
    res.setHeader('Content-Type', mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('GET /books/:id/file:', err);
    res.status(500).json({ message: 'Erro ao carregar arquivo.' });
  }
});

// ── DELETE /:id — soft delete (super_admin) ─────────────────────
router.delete('/:id', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query(`UPDATE books SET deleted_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Livro removido.' });
  } catch (err) {
    console.error('DELETE /books/:id:', err);
    res.status(500).json({ message: 'Erro ao remover livro.' });
  }
});

export default router;
