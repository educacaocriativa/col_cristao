import fs from 'fs';
import path from 'path';
import { pool, query } from '../config/database';

type ExportRow = {
  role: 'aluno' | 'professor';
  name: string;
  login_email: string | null;
  profile_code: string | null;
  school_name: string | null;
  password: string;
  source_email: string | null;
  source_document: string | null;
};

type StudentRow = {
  name: string;
  login_email: string | null;
  profile_code: string | null;
  school_name: string | null;
  mother_email: string | null;
  internal_enrollment: string | null;
};

type TeacherRow = {
  name: string;
  login_email: string | null;
  profile_code: string | null;
  school_name: string | null;
  cpf: string | null;
};

function studentPassword(motherEmail: string, internalEnrollment: string): string {
  const emailStart = motherEmail.trim().toLowerCase().split('@')[0].replace(/\s+/g, '');
  const enrollment = internalEnrollment.trim().replace(/\s+/g, '');
  return `${emailStart}${enrollment}`;
}

function teacherPassword(email: string, cpf: string): string {
  const emailStart = email.trim().toLowerCase().split('@')[0].replace(/\s+/g, '');
  const cpfStart = cpf.replace(/\D/g, '').slice(0, 3);
  return `${emailStart}${cpfStart}`;
}

function csvEscape(value: string | null | undefined): string {
  const text = value ?? '';
  if (/[",\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows: ExportRow[]): string {
  const header = [
    'perfil',
    'nome',
    'email_login',
    'codigo_perfil',
    'unidade',
    'senha_provisoria',
    'email_usado_na_regra',
    'documento_ou_matricula_usado_na_regra',
  ];

  const lines = rows.map((row) => [
    row.role,
    row.name,
    row.login_email,
    row.profile_code,
    row.school_name,
    row.password,
    row.source_email,
    row.source_document,
  ].map(csvEscape).join(';'));

  return [header.join(';'), ...lines].join('\n');
}

async function main() {
  const stdout = process.argv.includes('--stdout');
  const outputArg = process.argv.find((arg) => arg.startsWith('--out='));
  const defaultDir = process.env.UPLOADS_DIR || '.';
  const outputPath = outputArg
    ? path.resolve(outputArg.slice('--out='.length))
    : path.resolve(defaultDir, 'password-reset-export.csv');

  const studentsResult = await query(
    `SELECT u.name,
            u.email AS login_email,
            u.profile_code,
            s.name AS school_name,
            sp.mother_email,
            sp.internal_enrollment
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN schools s ON s.id = u.school_id
      WHERE u.role = 'aluno'
        AND u.deleted_at IS NULL
        AND COALESCE(u.active, true) = true
        AND sp.deleted_at IS NULL
        AND COALESCE(sp.active, true) = true
      ORDER BY u.name`
  );

  const teachersResult = await query(
    `SELECT u.name,
            u.email AS login_email,
            u.profile_code,
            s.name AS school_name,
            u.cpf
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
      WHERE u.role = 'professor'
        AND u.deleted_at IS NULL
        AND COALESCE(u.active, true) = true
      ORDER BY u.name`
  );

  const rows: ExportRow[] = [];

  for (const student of studentsResult.rows as StudentRow[]) {
    if (!student.mother_email?.includes('@') || !student.internal_enrollment?.trim()) continue;
    rows.push({
      role: 'aluno',
      name: student.name,
      login_email: student.login_email,
      profile_code: student.profile_code,
      school_name: student.school_name,
      password: studentPassword(student.mother_email, student.internal_enrollment),
      source_email: student.mother_email,
      source_document: student.internal_enrollment,
    });
  }

  for (const teacher of teachersResult.rows as TeacherRow[]) {
    const cpfDigits = teacher.cpf?.replace(/\D/g, '') ?? '';
    if (!teacher.login_email?.includes('@') || cpfDigits.length < 3) continue;
    rows.push({
      role: 'professor',
      name: teacher.name,
      login_email: teacher.login_email,
      profile_code: teacher.profile_code,
      school_name: teacher.school_name,
      password: teacherPassword(teacher.login_email, teacher.cpf!),
      source_email: teacher.login_email,
      source_document: teacher.cpf,
    });
  }

  rows.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  const csv = `\uFEFF${toCsv(rows)}`;
  if (stdout) {
    process.stdout.write(csv);
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv, 'utf8');
  console.log(`Planilha gerada: ${outputPath}`);
  console.log(`Usuarios exportados: ${rows.length}`);
}

main()
  .catch((err) => {
    console.error('Erro ao exportar planilha de senhas:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

