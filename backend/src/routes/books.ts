import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { verifyToken } from '../config/jwt';

// Auth para download de arquivo: aceita token via header Authorization
// OU via query string (?token=...). Necessário para abrir PDF em nova aba.
function authenticateFile(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const headerToken = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;
  const queryToken  = typeof req.query.token === 'string' ? req.query.token : null;
  const token = headerToken || queryToken;
  if (!token) {
    res.status(401).json({ message: 'Token de acesso não fornecido.' });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

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

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 400);

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Apenas arquivos PDF são aceitos.'));
    }
    cb(null, true);
  },
});

// Wrapper que captura erros do multer (LIMIT_FILE_SIZE, fileFilter) e responde com mensagem amigável.
function uploadSingle(field: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    upload.single(field)(req, res, (err: any) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ message: `Arquivo muito grande. Limite: ${MAX_UPLOAD_MB} MB.` });
        return;
      }
      res.status(400).json({ message: err.message || 'Erro no upload.' });
    });
  };
}

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
    `SELECT b.id, b.collection_id,
            b.name,
            bc.name AS collection_name,
            COALESCE(bc.subject, b.subject) AS subject,
            b.file_path, b.file_size, b.mime_type,
            COALESCE(bc.for_aluno, b.for_aluno) AS for_aluno,
            COALESCE(bc.for_professor, b.for_professor) AS for_professor,
            b.created_at
       FROM books b
       LEFT JOIN book_collections bc ON bc.id = b.collection_id AND bc.deleted_at IS NULL
      WHERE b.id = $1 AND b.deleted_at IS NULL`,
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

async function createBookItem(req: AuthRequest, collectionId: string | null, file: Express.Multer.File) {
  const { name, subject, item_name } = req.body;
  const schoolIds = parseIdList(req.body.school_ids);
  const gradeIds = parseIdList(req.body.grade_level_ids);
  const forAluno = toBool(req.body.for_aluno);
  const forProfessor = toBool(req.body.for_professor);

  const missing: string[] = [];
  if (!collectionId && !name?.trim()) missing.push('nome');
  if (collectionId && !(typeof item_name === 'string' && item_name.trim())) missing.push('nome do PDF');
  if (schoolIds.length === 0) missing.push('ao menos uma unidade');
  if (gradeIds.length === 0) missing.push('ao menos um ano escolar');
  if (!collectionId && !forAluno && !forProfessor) missing.push('alvo (aluno e/ou professor)');

  if (missing.length > 0) {
    fs.unlink(file.path, () => {});
    const err = new Error(`Campos obrigatórios: ${missing.join(', ')}.`);
    (err as any).status = 400;
    throw err;
  }

  let finalCollectionId = collectionId;
  if (!finalCollectionId) {
    const collectionRes = await query(
      `INSERT INTO book_collections (name, subject, for_aluno, for_professor, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [
        name.trim(),
        (typeof subject === 'string' && subject.trim()) ? subject.trim() : null,
        forAluno,
        forProfessor,
        req.user?.id ?? null,
      ]
    );
    finalCollectionId = collectionRes.rows[0].id;
  }

  const collectionRes = await query(
    `SELECT name, subject, for_aluno, for_professor
       FROM book_collections
      WHERE id = $1 AND deleted_at IS NULL`,
    [finalCollectionId]
  );
  if (collectionRes.rows.length === 0) {
    fs.unlink(file.path, () => {});
    const err = new Error('Livro não encontrado.');
    (err as any).status = 404;
    throw err;
  }
  const collection = collectionRes.rows[0];

  const bookRes = await query(
    `INSERT INTO books (collection_id, name, subject, file_path, file_size, mime_type, for_aluno, for_professor, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      finalCollectionId,
      (typeof item_name === 'string' && item_name.trim()) ? item_name.trim() : collection.name,
      collection.subject,
      path.basename(file.path),
      file.size,
      file.mimetype,
      collection.for_aluno,
      collection.for_professor,
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

  return loadBookWithLinks(bookId);
}

// ── POST / — cadastra livro (super_admin) ───────────────────────
router.post(
  '/',
  authenticate,
  authorize('super_admin'),
  uploadSingle('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: 'Campos obrigatórios: arquivo PDF.' });
      const full = await createBookItem(req, null, file);
      res.status(201).json(full);
    } catch (err: any) {
      console.error('POST /books:', err);
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(err.status || 500).json({ message: err.message || 'Erro ao cadastrar livro.' });
    }
  }
);

// ── POST /collections — cria o livro principal (super_admin) ─────
router.post('/collections', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, subject } = req.body;
    const forAluno = toBool(req.body.for_aluno);
    const forProfessor = toBool(req.body.for_professor);

    const missing: string[] = [];
    if (!name?.trim()) missing.push('nome do livro');
    if (!forAluno && !forProfessor) missing.push('aluno e/ou professor');
    if (missing.length > 0) {
      return res.status(400).json({ message: `Campos obrigatórios: ${missing.join(', ')}.` });
    }

    const result = await query(
      `INSERT INTO book_collections (name, subject, for_aluno, for_professor, created_by)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, name, subject, for_aluno, for_professor, created_at`,
      [
        name.trim(),
        (typeof subject === 'string' && subject.trim()) ? subject.trim() : null,
        forAluno,
        forProfessor,
        req.user?.id ?? null,
      ]
    );
    res.status(201).json({ ...result.rows[0], items: [] });
  } catch (err) {
    console.error('POST /books/collections:', err);
    res.status(500).json({ message: 'Erro ao criar livro.' });
  }
});

// ── POST /collections/:id/items — adiciona PDF dentro do livro ───
router.post(
  '/collections/:id/items',
  authenticate,
  authorize('super_admin'),
  uploadSingle('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: 'Campos obrigatórios: arquivo PDF.' });
      const full = await createBookItem(req, String(req.params.id), file);
      res.status(201).json(full);
    } catch (err: any) {
      console.error('POST /books/collections/:id/items:', err);
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(err.status || 500).json({ message: err.message || 'Erro ao adicionar PDF ao livro.' });
    }
  }
);

// ── GET /collections — lista livros principais com PDFs internos ─
router.get('/collections', authenticate, authorize('super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT bc.id, bc.name, bc.subject, bc.for_aluno, bc.for_professor, bc.created_at,
              COALESCE(
                json_agg(
                  DISTINCT jsonb_build_object(
                    'id', b.id,
                    'name', b.name,
                    'file_size', b.file_size,
                    'created_at', b.created_at,
                    'schools', COALESCE(schools.items, '[]'::jsonb),
                    'grade_levels', COALESCE(grades.items, '[]'::jsonb)
                  )
                ) FILTER (WHERE b.id IS NOT NULL),
                '[]'
              ) AS items
         FROM book_collections bc
         LEFT JOIN books b ON b.collection_id = bc.id AND b.deleted_at IS NULL
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) ORDER BY s.name) AS items
             FROM book_schools bs
             JOIN schools s ON s.id = bs.school_id AND s.deleted_at IS NULL
            WHERE bs.book_id = b.id
         ) schools ON true
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'order_index', g.order_index) ORDER BY g.order_index) AS items
             FROM book_grade_levels bg
             JOIN grade_levels g ON g.id = bg.grade_level_id
            WHERE bg.book_id = b.id
         ) grades ON true
        WHERE bc.deleted_at IS NULL
        GROUP BY bc.id
        ORDER BY bc.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /books/collections:', err);
    res.status(500).json({ message: 'Erro ao listar livros principais.' });
  }
});

// ── GET / — lista livros visíveis para o usuário ────────────────
function buildVisibleBookConditions(req: AuthRequest) {
  const u = req.user!;
  const role = u.role;
  const schoolId = u.schoolId;
  const conditions: string[] = ['b.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (role === 'super_admin') {
    // ve tudo
  } else if (role === 'admin' || role === 'pedagogico') {
    if (!schoolId) return null;
    params.push(schoolId);
    conditions.push(`EXISTS (SELECT 1 FROM book_schools bs WHERE bs.book_id = b.id AND bs.school_id = $${params.length})`);
  } else if (role === 'professor') {
    if (!schoolId) return null;
    params.push(schoolId);
    conditions.push(`EXISTS (SELECT 1 FROM book_schools bs WHERE bs.book_id = b.id AND bs.school_id = $${params.length})`);
    conditions.push('COALESCE(bc.for_professor, b.for_professor) = true');
  } else if (role === 'aluno') {
    if (!schoolId) return null;
    params.push(schoolId);
    conditions.push(`EXISTS (SELECT 1 FROM book_schools bs WHERE bs.book_id = b.id AND bs.school_id = $${params.length})`);
    conditions.push('COALESCE(bc.for_aluno, b.for_aluno) = true');
    params.push(u.id);
    conditions.push(`EXISTS (
      SELECT 1 FROM book_grade_levels bg
        JOIN classes c ON c.grade_level_id = bg.grade_level_id
        JOIN class_students cs ON cs.class_id = c.id
       WHERE bg.book_id = b.id AND cs.student_id = $${params.length} AND cs.active = true
    )`);
  } else {
    return null;
  }

  return { conditions, params };
}

router.get('/my-collections', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const visibility = buildVisibleBookConditions(req);
    if (!visibility) return res.json([]);
    const { conditions, params } = visibility;

    const result = await query(
      `SELECT COALESCE(bc.id, b.id) AS id,
              COALESCE(bc.name, b.name) AS name,
              COALESCE(bc.subject, b.subject) AS subject,
              COALESCE(bc.for_aluno, b.for_aluno) AS for_aluno,
              COALESCE(bc.for_professor, b.for_professor) AS for_professor,
              COALESCE(bc.created_at, b.created_at) AS created_at,
              COALESCE(
                json_agg(
                  DISTINCT jsonb_build_object(
                    'id', b.id,
                    'name', b.name,
                    'file_size', b.file_size,
                    'created_at', b.created_at,
                    'schools', COALESCE(schools.items, '[]'::jsonb),
                    'grade_levels', COALESCE(grades.items, '[]'::jsonb)
                  )
                ) FILTER (WHERE b.id IS NOT NULL),
                '[]'
              ) AS items
         FROM books b
         LEFT JOIN book_collections bc ON bc.id = b.collection_id AND bc.deleted_at IS NULL
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) ORDER BY s.name) AS items
             FROM book_schools bs
             JOIN schools s ON s.id = bs.school_id AND s.deleted_at IS NULL
            WHERE bs.book_id = b.id
         ) schools ON true
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'order_index', g.order_index) ORDER BY g.order_index) AS items
             FROM book_grade_levels bg
             JOIN grade_levels g ON g.id = bg.grade_level_id
            WHERE bg.book_id = b.id
         ) grades ON true
        WHERE ${conditions.join(' AND ')}
        GROUP BY COALESCE(bc.id, b.id), COALESCE(bc.name, b.name), COALESCE(bc.subject, b.subject),
                 COALESCE(bc.for_aluno, b.for_aluno), COALESCE(bc.for_professor, b.for_professor),
                 COALESCE(bc.created_at, b.created_at)
        ORDER BY COALESCE(bc.created_at, b.created_at) DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /books/my-collections:', err);
    res.status(500).json({ message: 'Erro ao listar livros.' });
  }
});

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
      conditions.push('COALESCE(bc.for_professor, b.for_professor) = true');
    } else if (role === 'aluno') {
      if (!schoolId) return res.json([]);
      params.push(schoolId);
      conditions.push(`EXISTS (SELECT 1 FROM book_schools bs WHERE bs.book_id = b.id AND bs.school_id = $${params.length})`);
      conditions.push('COALESCE(bc.for_aluno, b.for_aluno) = true');
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
      `SELECT b.id, b.collection_id,
              b.name,
              bc.name AS collection_name,
              COALESCE(bc.subject, b.subject) AS subject,
              b.file_size,
              COALESCE(bc.for_aluno, b.for_aluno) AS for_aluno,
              COALESCE(bc.for_professor, b.for_professor) AS for_professor,
              b.created_at,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', s.id, 'name', s.name)) FILTER (WHERE s.id IS NOT NULL), '[]') AS schools,
              COALESCE(json_agg(DISTINCT jsonb_build_object('id', g.id, 'name', g.name, 'order_index', g.order_index)) FILTER (WHERE g.id IS NOT NULL), '[]') AS grade_levels
         FROM books b
         LEFT JOIN book_collections bc ON bc.id = b.collection_id AND bc.deleted_at IS NULL
         LEFT JOIN book_schools bs       ON bs.book_id = b.id
         LEFT JOIN schools s             ON s.id = bs.school_id AND s.deleted_at IS NULL
         LEFT JOIN book_grade_levels bg  ON bg.book_id = b.id
         LEFT JOIN grade_levels g        ON g.id = bg.grade_level_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY b.id, bc.id
        ORDER BY COALESCE(bc.created_at, b.created_at) DESC, b.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /books:', err);
    res.status(500).json({ message: 'Erro ao listar livros.' });
  }
});

// ── GET /:id/file — stream do PDF ───────────────────────────────
router.get('/:id/file', authenticateFile, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT b.file_path, b.mime_type, b.name
         FROM books b
         LEFT JOIN book_collections bc ON bc.id = b.collection_id AND bc.deleted_at IS NULL
        WHERE b.id = $1 AND b.deleted_at IS NULL`,
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

// ── GET /subjects/suggestions — nomes distintos de disciplinas (super_admin) ─
router.get('/subjects/suggestions', authenticate, authorize('super_admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT DISTINCT name FROM subjects WHERE active = true
       UNION
       SELECT DISTINCT subject AS name FROM books WHERE subject IS NOT NULL AND deleted_at IS NULL
       UNION
       SELECT DISTINCT subject AS name FROM book_collections WHERE subject IS NOT NULL AND deleted_at IS NULL
       ORDER BY name`
    );
    res.json(result.rows.map((r) => r.name));
  } catch (err) {
    console.error('GET /books/subjects/suggestions:', err);
    res.status(500).json({ message: 'Erro ao listar disciplinas.' });
  }
});

// ── DELETE /collections/:id — remove livro principal (super_admin) ─
router.delete('/collections/:id', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query(`UPDATE book_collections SET deleted_at = NOW() WHERE id = $1`, [req.params.id]);
    await query(`UPDATE books SET deleted_at = NOW() WHERE collection_id = $1`, [req.params.id]);
    res.json({ message: 'Livro removido.' });
  } catch (err) {
    console.error('DELETE /books/collections/:id:', err);
    res.status(500).json({ message: 'Erro ao remover livro.' });
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
