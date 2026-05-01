import bcrypt from 'bcryptjs';
import { pool, query } from '../config/database';

type TeacherRow = {
  user_id: string;
  name: string;
  email: string | null;
  cpf: string | null;
  profile_code: string | null;
};

function buildPassword(email: string, cpf: string): string {
  const emailStart = email.trim().toLowerCase().split('@')[0].replace(/\s+/g, '');
  const cpfStart = cpf.replace(/\D/g, '').slice(0, 3);
  return `${emailStart}${cpfStart}`;
}

function maskPassword(password: string): string {
  if (password.length <= 4) return '****';
  return `${password.slice(0, 3)}***${password.slice(-2)}`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const showPasswords = process.argv.includes('--show-passwords');

  const result = await query(
    `SELECT id AS user_id,
            name,
            email,
            cpf,
            profile_code
       FROM users
      WHERE role = 'professor'
        AND deleted_at IS NULL
        AND COALESCE(active, true) = true
      ORDER BY name`
  );

  const rows = result.rows as TeacherRow[];
  const isValid = (row: TeacherRow) => Boolean(row.email?.includes('@') && (row.cpf?.replace(/\D/g, '').length ?? 0) >= 3);
  const valid = rows.filter(isValid);
  const skipped = rows.filter((row) => !isValid(row));

  console.log(`Professores encontrados: ${rows.length}`);
  console.log(`Senhas que ${apply ? 'serao alteradas' : 'seriam alteradas'}: ${valid.length}`);
  console.log(`Ignorados por falta de email valido ou CPF: ${skipped.length}`);

  if (skipped.length > 0) {
    console.log('\nIgnorados:');
    for (const row of skipped) {
      console.log(`- ${row.name} | perfil=${row.profile_code || '-'} | email=${row.email || '-'} | cpf=${row.cpf || '-'}`);
    }
  }

  console.log('\nPrevia das senhas:');
  for (const row of valid.slice(0, 20)) {
    const password = buildPassword(row.email!, row.cpf!);
    console.log(`- ${row.name} | perfil=${row.profile_code || '-'} | senha=${showPasswords ? password : maskPassword(password)}`);
  }
  if (valid.length > 20) {
    console.log(`...mais ${valid.length - 20} professor(es).`);
  }

  if (!apply) {
    console.log('\nSimulacao concluida. Para alterar de verdade, rode com --apply.');
    console.log('Para imprimir as senhas completas no terminal, adicione --show-passwords.');
    return;
  }

  for (const row of valid) {
    const password = buildPassword(row.email!, row.cpf!);
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
    console.error('Erro ao restaurar senhas dos professores:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
