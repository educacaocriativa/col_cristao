import bcrypt from 'bcryptjs';
import { pool, query } from '../config/database';

type StudentRow = {
  user_id: string;
  name: string;
  email: string | null;
  profile_code: string | null;
  mother_email: string | null;
  internal_enrollment: string | null;
};

function buildPassword(motherEmail: string, internalEnrollment: string): string {
  const emailStart = motherEmail.trim().toLowerCase().split('@')[0].replace(/\s+/g, '');
  const enrollment = internalEnrollment.trim().replace(/\s+/g, '');
  return `${emailStart}${enrollment}`;
}

function maskPassword(password: string): string {
  if (password.length <= 4) return '****';
  return `${password.slice(0, 3)}***${password.slice(-2)}`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const showPasswords = process.argv.includes('--show-passwords');

  const result = await query(
    `SELECT u.id AS user_id,
            u.name,
            u.email,
            u.profile_code,
            sp.mother_email,
            sp.internal_enrollment
       FROM users u
       JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'aluno'
        AND u.deleted_at IS NULL
        AND COALESCE(u.active, true) = true
        AND sp.deleted_at IS NULL
        AND COALESCE(sp.active, true) = true
      ORDER BY u.name`
  );

  const rows = result.rows as StudentRow[];
  const valid = rows.filter((row) => row.mother_email?.includes('@') && row.internal_enrollment?.trim());
  const skipped = rows.filter((row) => !row.mother_email?.includes('@') || !row.internal_enrollment?.trim());

  console.log(`Alunos encontrados: ${rows.length}`);
  console.log(`Senhas que ${apply ? 'serao alteradas' : 'seriam alteradas'}: ${valid.length}`);
  console.log(`Ignorados por falta de email_mae ou matricula_interna: ${skipped.length}`);

  if (skipped.length > 0) {
    console.log('\nIgnorados:');
    for (const row of skipped) {
      console.log(`- ${row.name} | perfil=${row.profile_code || '-'} | email_mae=${row.mother_email || '-'} | matricula=${row.internal_enrollment || '-'}`);
    }
  }

  console.log('\nPrevia das senhas:');
  for (const row of valid.slice(0, 20)) {
    const password = buildPassword(row.mother_email!, row.internal_enrollment!);
    console.log(`- ${row.name} | perfil=${row.profile_code || '-'} | senha=${showPasswords ? password : maskPassword(password)}`);
  }
  if (valid.length > 20) {
    console.log(`...mais ${valid.length - 20} aluno(s).`);
  }

  if (!apply) {
    console.log('\nSimulacao concluida. Para alterar de verdade, rode com --apply.');
    console.log('Para imprimir as senhas completas no terminal, adicione --show-passwords.');
    return;
  }

  for (const row of valid) {
    const password = buildPassword(row.mother_email!, row.internal_enrollment!);
    const hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users
          SET password_hash = $1,
              updated_at = NOW()
        WHERE id = $2`,
      [hash, row.user_id]
    );
  }

  console.log(`\nConcluido: ${valid.length} senha(s) atualizada(s).`);
}

main()
  .catch((err) => {
    console.error('Erro ao restaurar senhas dos alunos:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
