import fs from 'fs';
import path from 'path';
import { pool, query } from '../config/database';

type StudentAuditRow = {
  name: string;
  login_email: string | null;
  profile_code: string | null;
  school_name: string | null;
  cpf: string | null;
  internal_enrollment: string | null;
  student_email: string | null;
  mother_email: string | null;
  father_email: string | null;
  active: boolean | null;
};

function csvEscape(value: string | number | boolean | null | undefined): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function status(row: StudentAuditRow): string {
  if (!row.active) return 'INATIVO';
  if (!row.login_email) return 'SEM_EMAIL_LOGIN';
  if (!row.login_email.includes('@')) return 'EMAIL_LOGIN_INVALIDO';
  return 'OK';
}

function generatedPassword(row: StudentAuditRow): string {
  if (!row.mother_email?.includes('@') || !row.internal_enrollment?.trim()) return '';
  const emailStart = row.mother_email.trim().toLowerCase().split('@')[0].replace(/\s+/g, '');
  const enrollment = row.internal_enrollment.trim().replace(/\s+/g, '');
  return `${emailStart}${enrollment}`;
}

function toCsv(rows: StudentAuditRow[]): string {
  const header = [
    'status',
    'nome',
    'email_login_users',
    'codigo_perfil',
    'unidade',
    'cpf',
    'matricula_interna',
    'email_aluno_student_profiles',
    'email_mae',
    'email_pai',
    'senha_provisoria_calculada',
  ];

  const lines = rows.map((row) => [
    status(row),
    row.name,
    row.login_email,
    row.profile_code,
    row.school_name,
    row.cpf,
    row.internal_enrollment,
    row.student_email,
    row.mother_email,
    row.father_email,
    generatedPassword(row),
  ].map(csvEscape).join(';'));

  return [header.join(';'), ...lines].join('\n');
}

async function main() {
  const stdout = process.argv.includes('--stdout');
  const outputArg = process.argv.find((arg) => arg.startsWith('--out='));
  const defaultDir = process.env.UPLOADS_DIR || '.';
  const outputPath = outputArg
    ? path.resolve(outputArg.slice('--out='.length))
    : path.resolve(defaultDir, 'student-login-audit.csv');

  const result = await query(
    `SELECT u.name,
            u.email AS login_email,
            u.profile_code,
            s.name AS school_name,
            u.cpf,
            sp.internal_enrollment,
            sp.student_email,
            sp.mother_email,
            sp.father_email,
            u.active
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN schools s ON s.id = u.school_id
      WHERE u.role = 'aluno'
        AND u.deleted_at IS NULL
        AND sp.deleted_at IS NULL
      ORDER BY
        CASE
          WHEN u.active IS NOT TRUE THEN 1
          WHEN u.email IS NULL OR u.email = '' THEN 0
          WHEN POSITION('@' IN u.email) = 0 THEN 0
          ELSE 2
        END,
        u.name`
  );

  const rows = result.rows as StudentAuditRow[];
  const csv = `\uFEFF${toCsv(rows)}`;

  const missingLogin = rows.filter((row) => status(row) === 'SEM_EMAIL_LOGIN').length;
  const invalidLogin = rows.filter((row) => status(row) === 'EMAIL_LOGIN_INVALIDO').length;
  const ok = rows.filter((row) => status(row) === 'OK').length;

  if (stdout) {
    process.stdout.write(csv);
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv, 'utf8');
  console.log(`Planilha gerada: ${outputPath}`);
  console.log(`Alunos exportados: ${rows.length}`);
  console.log(`OK: ${ok}`);
  console.log(`Sem email de login: ${missingLogin}`);
  console.log(`Email de login invalido: ${invalidLogin}`);
}

main()
  .catch((err) => {
    console.error('Erro ao exportar auditoria de login dos alunos:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

