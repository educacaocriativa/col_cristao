import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { generateToken, UserRole } from '../config/jwt';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'E-mail/matricula e senha sao obrigatorios.' });
    return;
  }

  try {
    const identifier = String(email).trim();
    const emailIdentifier = identifier.toLowerCase();

    const result = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.school_id, u.active,
              s.name AS school_name,
              sp.internal_enrollment
         FROM users u
         LEFT JOIN schools s ON u.school_id = s.id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE LOWER(u.email) = $1
           OR (u.role = 'aluno' AND sp.internal_enrollment = $2)`,
      [emailIdentifier, identifier]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Credenciais invalidas.' });
      return;
    }

    const activeUsers = result.rows.filter((row) => row.active);
    if (activeUsers.length === 0) {
      res.status(403).json({ message: 'Sua conta esta desativada. Entre em contato com o administrador.' });
      return;
    }

    let user = null;
    for (const candidate of activeUsers) {
      const isValidPassword = await bcrypt.compare(password, candidate.password_hash);
      if (isValidPassword) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      res.status(401).json({ message: 'Credenciais invalidas.' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email || identifier,
      role: user.role as UserRole,
      schoolId: user.school_id,
      name: user.name,
    });

    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email || '',
        role: user.role,
        schoolId: user.school_id,
        schoolName: user.school_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

export const me = async (req: Request & { user?: { id: string } }, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT u.id, u.name, COALESCE(u.email, '') AS email, u.role, u.school_id, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1`,
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Usuario nao encontrado.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};
