import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'colegio-cristao-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  schoolId?: string;
  name: string;
}

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'pedagogico'
  | 'professor'
  | 'aluno'
  | 'pais';

export const generateToken = (payload: JWTPayload): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};
