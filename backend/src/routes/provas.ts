import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { verifyToken } from '../config/jwt';

function authenticateFile(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const headerToken = header?.startsWith('Bearer ') ? header.split(' ')[1] : null;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token = headerToken || queryToken;

  if (!token) {
    res.status(401).json({ message: 'Token de acesso nao fornecido.' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Token invalido ou expirado.' });
  }
}

const router = Router();

const UPLOAD_DIR = path.resolve(process.env.UPLOADS_DIR || './uploads', 'provas');
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
      return cb(new Error('Apenas arquivos PDF sao aceitos.'));
    }
    cb(null, true);
  },
});

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

router.get('/', authenticate, authorize('super_admin', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const params: unknown[] = [];
    const conditions = ['p.deleted_at IS NULL'];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`p.name ILIKE $${params.length}`);
    }

    const result = await query(
      `SELECT p.id, p.name, p.original_filename, p.file_size, p.mime_type, p.created_at,
              u.name AS created_by_name
         FROM exam_pdfs p
         LEFT JOIN users u ON u.id = p.created_by
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /provas:', err);
    res.status(500).json({ message: 'Erro ao listar provas.' });
  }
});

router.post(
  '/',
  authenticate,
  authorize('super_admin'),
  uploadSingle('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

      if (!name || !file) {
        if (file) fs.unlink(file.path, () => {});
        res.status(400).json({ message: 'Campos obrigatorios: nome do arquivo e PDF.' });
        return;
      }

      const result = await query(
        `INSERT INTO exam_pdfs (name, original_filename, file_path, file_size, mime_type, created_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, name, original_filename, file_size, mime_type, created_at`,
        [
          name,
          file.originalname,
          path.basename(file.path),
          file.size,
          file.mimetype,
          req.user?.id ?? null,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /provas:', err);
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ message: 'Erro ao adicionar prova.' });
    }
  }
);

router.get('/:id/download', authenticateFile, authorize('super_admin', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT name, original_filename, file_path, mime_type
         FROM exam_pdfs
        WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Prova nao encontrada.' });
      return;
    }

    const { name, original_filename, file_path, mime_type } = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, file_path);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'Arquivo da prova nao encontrado.' });
      return;
    }

    const safeName = String(name || original_filename || 'prova')
      .replace(/\.pdf$/i, '')
      .replace(/[\\/:*?"<>|]/g, '-');
    const downloadName = `${safeName}.pdf`;
    res.setHeader('Content-Type', mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('GET /provas/:id/download:', err);
    res.status(500).json({ message: 'Erro ao baixar prova.' });
  }
});

export default router;
