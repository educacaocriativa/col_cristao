import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { generateToken, UserRole } from '../config/jwt';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
    return;
  }

  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.school_id, u.active,
              s.name as school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ message: 'Credenciais inválidas.' });
      return;
    }

    const user = result.rows[0];

    if (!user.active) {
      res.status(403).json({ message: 'Sua conta está desativada. Entre em contato com o administrador.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Credenciais inválidas.' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
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
        email: user.email,
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
      `SELECT u.id, u.name, u.email, u.role, u.school_id, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1`,
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Usuário não encontrado.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};
