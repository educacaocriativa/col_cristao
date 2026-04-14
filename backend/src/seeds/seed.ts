import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { query, pool } from '../config/database';

dotenv.config();

const hash = (p: string) => bcrypt.hash(p, 10);

async function seed() {
  console.log('🚀 Iniciando seed completo do Colégio Cristão...\n');

  try {
    // ══════════════════════════════════════════════════════════════
    // 1. LIMPEZA TOTAL DO BANCO (mantém grade_levels)
    // ══════════════════════════════════════════════════════════════
    console.log('🗑  Limpando banco de dados...');
    await query(`
      TRUNCATE TABLE
        store_purchases, store_products,
        coin_transactions, student_coins,
        trail_step_completions, trail_steps, learning_trails,
        ai_performance_reports,
        notifications,
        materials,
        social_comments, social_posts, social_blacklist,
        calendar_events,
        announcements,
        pedagogical_diary,
        attendance_records, attendance,
        grades,
        student_responses, activity_results,
        activity_questions, activities,
        question_alternatives, questions,
        bncc_skills,
        class_pedagogico, class_teachers, class_subjects, class_students, classes,
        academic_years,
        student_profiles,
        users,
        subjects,
        schools
      CASCADE
    `);
    console.log('✅ Banco limpo.\n');

    // ══════════════════════════════════════════════════════════════
    // 2. ESCOLA
    // ══════════════════════════════════════════════════════════════
    const schoolRes = await query(
      `INSERT INTO schools (name, address, city, state, zip_code, manager_name, manager_whatsapp, manager_email, manager_cpf, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING id`,
      ['Colégio Cristão — Unidade Central', 'Rua das Missões, 100', 'Curitiba', 'PR',
       '80000-000', 'Roberto Alves', '41999990000', 'roberto@colegiocristao.edu.br', '000.000.000-00']
    );
    const schoolId = schoolRes.rows[0].id;
    console.log('✅ Escola criada:', schoolId);

    // ══════════════════════════════════════════════════════════════
    // 3. USUÁRIOS
    // ══════════════════════════════════════════════════════════════
    const userDefs = [
      // ─ Super Admin ─────────────────────────────────────────────
      {
        key: 'super', role: 'super_admin', school: null,
        name: 'Carlos Mendonça', email: 'super@colegiocristao.edu.br',
        cpf: null, profileCode: null, password: 'Super@2025',
        whatsapp: '41999990001',
      },
      // ─ Admin ───────────────────────────────────────────────────
      {
        key: 'admin', role: 'admin', school: schoolId,
        name: 'Maria Santos', email: 'admin@colegiocristao.edu.br',
        cpf: '11111111111', profileCode: 'ADM25001', password: 'ADM25001@111',
        whatsapp: '41999990002',
      },
      // ─ Pedagógicos ─────────────────────────────────────────────
      {
        key: 'ped1', role: 'pedagogico', school: schoolId,
        name: 'Ana Paula Oliveira', email: 'ana.paula@colegiocristao.edu.br',
        cpf: '22222222222', profileCode: 'PED25001', password: 'PED25001@222',
        whatsapp: '41999990003',
      },
      {
        key: 'ped2', role: 'pedagogico', school: schoolId,
        name: 'Ricardo Barros', email: 'ricardo.barros@colegiocristao.edu.br',
        cpf: '33333333333', profileCode: 'PED25002', password: 'PED25002@333',
        whatsapp: '41999990004',
      },
      // ─ Professores ─────────────────────────────────────────────
      {
        key: 'profMat', role: 'professor', school: schoolId,
        name: 'Lucas Ferreira', email: 'lucas.ferreira@colegiocristao.edu.br',
        cpf: '44444444444', profileCode: 'PRO25001', password: 'PRO25001@444',
        whatsapp: '41999990005',
      },
      {
        key: 'profPor', role: 'professor', school: schoolId,
        name: 'Juliana Costa', email: 'juliana.costa@colegiocristao.edu.br',
        cpf: '55555555555', profileCode: 'PRO25002', password: 'PRO25002@555',
        whatsapp: '41999990006',
      },
      {
        key: 'profCie', role: 'professor', school: schoolId,
        name: 'Eduardo Lima', email: 'eduardo.lima@colegiocristao.edu.br',
        cpf: '66666666666', profileCode: 'PRO25003', password: 'PRO25003@666',
        whatsapp: '41999990007',
      },
      // ─ Alunos ──────────────────────────────────────────────────
      {
        key: 'alu1', role: 'aluno', school: schoolId,
        name: 'Alice Fernandes', email: 'alice@aluno.colegiocristao.edu.br',
        cpf: '77777777777', profileCode: 'ALU25001', password: 'ALU25001@777',
        whatsapp: '41999880001',
      },
      {
        key: 'alu2', role: 'aluno', school: schoolId,
        name: 'Bruno Souza', email: 'bruno@aluno.colegiocristao.edu.br',
        cpf: '88888888888', profileCode: 'ALU25002', password: 'ALU25002@888',
        whatsapp: '41999880002',
      },
      {
        key: 'alu3', role: 'aluno', school: schoolId,
        name: 'Carla Mendes', email: 'carla@aluno.colegiocristao.edu.br',
        cpf: '99999999999', profileCode: 'ALU25003', password: 'ALU25003@999',
        whatsapp: '41999880003',
      },
      {
        key: 'alu4', role: 'aluno', school: schoolId,
        name: 'Diego Ramos', email: 'diego@aluno.colegiocristao.edu.br',
        cpf: '10010010011', profileCode: 'ALU25004', password: 'ALU25004@100',
        whatsapp: '41999880004',
      },
      {
        key: 'alu5', role: 'aluno', school: schoolId,
        name: 'Elena Vieira', email: 'elena@aluno.colegiocristao.edu.br',
        cpf: '20020020022', profileCode: 'ALU25005', password: 'ALU25005@200',
        whatsapp: '41999880005',
      },
      {
        key: 'alu6', role: 'aluno', school: schoolId,
        name: 'Felipe Nunes', email: 'felipe@aluno.colegiocristao.edu.br',
        cpf: '30030030033', profileCode: 'ALU25006', password: 'ALU25006@300',
        whatsapp: '41999880006',
      },
      {
        key: 'alu7', role: 'aluno', school: schoolId,
        name: 'Gabriela Pinto', email: 'gabriela@aluno.colegiocristao.edu.br',
        cpf: '40040040044', profileCode: 'ALU25007', password: 'ALU25007@400',
        whatsapp: '41999880007',
      },
      {
        key: 'alu8', role: 'aluno', school: schoolId,
        name: 'Henrique Rocha', email: 'henrique@aluno.colegiocristao.edu.br',
        cpf: '50050050055', profileCode: 'ALU25008', password: 'ALU25008@500',
        whatsapp: '41999880008',
      },
      // ─ Pais ────────────────────────────────────────────────────
      {
        key: 'pai1', role: 'pais', school: schoolId,
        name: 'Fernanda Fernandes', email: 'fernanda.mae@colegiocristao.edu.br',
        cpf: null, profileCode: null, password: 'Controle@2025',
        whatsapp: '41999770001',
      },
      {
        key: 'pai2', role: 'pais', school: schoolId,
        name: 'Marcos Souza', email: 'marcos.pai@colegiocristao.edu.br',
        cpf: null, profileCode: null, password: 'Controle@2025',
        whatsapp: '41999770002',
      },
    ];

    const users: Record<string, string> = {};
    for (const u of userDefs) {
      const ph = await hash(u.password);
      const res = await query(
        `INSERT INTO users (school_id, name, email, password_hash, role, cpf, whatsapp, profile_code, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id`,
        [u.school, u.name, u.email, ph, u.role, u.cpf, u.whatsapp, u.profileCode]
      );
      users[u.key] = res.rows[0].id;
    }
    console.log('✅ Usuários criados:', Object.keys(users).length);

    // ── Perfis dos alunos ──────────────────────────────────────
    const alunoKeys = ['alu1','alu2','alu3','alu4','alu5','alu6','alu7','alu8'];
    const alunoNames = ['Alice Fernandes','Bruno Souza','Carla Mendes','Diego Ramos','Elena Vieira','Felipe Nunes','Gabriela Pinto','Henrique Rocha'];
    for (let i = 0; i < alunoKeys.length; i++) {
      const motherEmail = alunoKeys[i] === 'alu1' ? 'fernanda.mae@colegiocristao.edu.br' : null;
      const fatherEmail = alunoKeys[i] === 'alu2' ? 'marcos.pai@colegiocristao.edu.br' : null;
      await query(
        `INSERT INTO student_profiles
           (user_id, school_id, full_name, internal_enrollment, sere_enrollment,
            birth_date, mother_name, mother_email, mother_whatsapp,
            father_name, father_email, father_whatsapp,
            city, state, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true)`,
        [
          users[alunoKeys[i]], schoolId, alunoNames[i],
          `2025${String(i + 1).padStart(3, '0')}`,
          `SERE${String(i + 1).padStart(5, '0')}`,
          `2012-0${(i % 9) + 1}-15`,
          'Fernanda ' + alunoNames[i].split(' ').pop(), motherEmail, '41999770001',
          'Marcos ' + alunoNames[i].split(' ').pop(), fatherEmail, '41999770002',
          'Curitiba', 'PR',
        ]
      );
    }
    console.log('✅ Perfis dos alunos criados');

    // ══════════════════════════════════════════════════════════════
    // 4. ANO LETIVO + GRADE LEVELS
    // ══════════════════════════════════════════════════════════════
    const yearRes = await query(
      `INSERT INTO academic_years (school_id, year, start_date, end_date, active)
       VALUES ($1, 2025, '2025-02-03', '2025-12-12', true) RETURNING id`,
      [schoolId]
    );
    const yearId = yearRes.rows[0].id;
    console.log('✅ Ano letivo 2025:', yearId);

    const gl4  = await query(`SELECT id FROM grade_levels WHERE name = '4º Ano'`);
    const gl5  = await query(`SELECT id FROM grade_levels WHERE name = '5º Ano'`);
    const gl9  = await query(`SELECT id FROM grade_levels WHERE name = '9º Ano'`);
    const grade4Id = gl4.rows[0]?.id;
    const grade5Id = gl5.rows[0]?.id;
    const grade9Id = gl9.rows[0]?.id;

    // ══════════════════════════════════════════════════════════════
    // 5. DISCIPLINAS
    // ══════════════════════════════════════════════════════════════
    const subjectDefs = [
      { key: 'MAT', name: 'Matemática',        code: 'MAT', color: '#6366f1', icon: '🔢' },
      { key: 'POR', name: 'Língua Portuguesa',  code: 'POR', color: '#ec4899', icon: '📝' },
      { key: 'CIE', name: 'Ciências',           code: 'CIE', color: '#10b981', icon: '🔬' },
      { key: 'HIS', name: 'História',            code: 'HIS', color: '#f59e0b', icon: '🏛' },
      { key: 'GEO', name: 'Geografia',           code: 'GEO', color: '#3b82f6', icon: '🌍' },
      { key: 'ING', name: 'Inglês',              code: 'ING', color: '#8b5cf6', icon: '🌐' },
      { key: 'EDF', name: 'Educação Física',     code: 'EDF', color: '#ef4444', icon: '⚽' },
      { key: 'ART', name: 'Arte',                code: 'ART', color: '#f97316', icon: '🎨' },
    ];
    const subjects: Record<string, string> = {};
    for (const s of subjectDefs) {
      const res = await query(
        `INSERT INTO subjects (school_id, name, code, color, icon, active)
         VALUES ($1,$2,$3,$4,$5,true) RETURNING id`,
        [schoolId, s.name, s.code, s.color, s.icon]
      );
      subjects[s.key] = res.rows[0].id;
    }
    console.log('✅ Disciplinas criadas:', Object.keys(subjects).length);

    // ══════════════════════════════════════════════════════════════
    // 6. TURMAS
    // ══════════════════════════════════════════════════════════════
    const classDefs = [
      { key: 'turmaA', name: 'Cativante',  gradeId: grade4Id, gradeName: '4º Ano', shift: 'manha'  },
      { key: 'turmaB', name: 'Destemido',  gradeId: grade5Id, gradeName: '5º Ano', shift: 'tarde'  },
      { key: 'turmaC', name: 'Explorador', gradeId: grade9Id, gradeName: '9º Ano', shift: 'manha'  },
    ];
    const classes: Record<string, string> = {};
    for (const c of classDefs) {
      if (!c.gradeId) continue;
      const res = await query(
        `INSERT INTO classes (school_id, academic_year_id, grade_level_id, name, full_name, shift, active)
         VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
        [schoolId, yearId, c.gradeId, c.name, `${c.gradeName} | ${c.name}`, c.shift]
      );
      classes[c.key] = res.rows[0].id;
    }
    const mainClass = classes['turmaA']; // turma principal para vincular dados
    console.log('✅ Turmas criadas:', Object.keys(classes).length);

    // ══════════════════════════════════════════════════════════════
    // 7. VÍNCULOS: Professores, Pedagógicos, Alunos
    // ══════════════════════════════════════════════════════════════

    // Professores → disciplinas por turma
    const csPairs = [
      // Turma A (4º Ano - Cativante)
      { classKey: 'turmaA', sub: 'MAT', teacher: 'profMat' },
      { classKey: 'turmaA', sub: 'POR', teacher: 'profPor' },
      { classKey: 'turmaA', sub: 'CIE', teacher: 'profCie' },
      { classKey: 'turmaA', sub: 'HIS', teacher: 'profPor' },
      { classKey: 'turmaA', sub: 'GEO', teacher: 'profCie' },
      { classKey: 'turmaA', sub: 'ING', teacher: 'profMat' },
      { classKey: 'turmaA', sub: 'EDF', teacher: 'profCie' },
      { classKey: 'turmaA', sub: 'ART', teacher: 'profPor' },
      // Turma B (5º Ano - Destemido)
      { classKey: 'turmaB', sub: 'MAT', teacher: 'profMat' },
      { classKey: 'turmaB', sub: 'POR', teacher: 'profPor' },
      { classKey: 'turmaB', sub: 'CIE', teacher: 'profCie' },
      // Turma C (9º Ano - Explorador)
      { classKey: 'turmaC', sub: 'MAT', teacher: 'profMat' },
      { classKey: 'turmaC', sub: 'POR', teacher: 'profPor' },
    ];
    for (const cs of csPairs) {
      await query(
        `INSERT INTO class_subjects (class_id, subject_id, teacher_id)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [classes[cs.classKey], subjects[cs.sub], users[cs.teacher]]
      );
    }

    // class_teachers (vínculo geral sem disciplina)
    for (const classKey of Object.keys(classes)) {
      for (const teacher of ['profMat', 'profPor', 'profCie']) {
        await query(
          `INSERT INTO class_teachers (class_id, teacher_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [classes[classKey], users[teacher]]
        );
      }
    }

    // Pedagógicos
    for (const classKey of Object.keys(classes)) {
      await query(`INSERT INTO class_pedagogico (class_id, pedagogico_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [classes[classKey], users['ped1']]);
      if (classKey === 'turmaC') {
        await query(`INSERT INTO class_pedagogico (class_id, pedagogico_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [classes[classKey], users['ped2']]);
      }
    }

    // Alunos — todos na turmaA; alu5-8 também na turmaB
    const allAlunoIds = alunoKeys.map(k => users[k]);
    for (const sid of allAlunoIds) {
      await query(
        `INSERT INTO class_students (class_id, student_id, active) VALUES ($1,$2,true) ON CONFLICT DO NOTHING`,
        [mainClass, sid]
      );
    }
    const extraAlunos = ['alu5','alu6','alu7','alu8'].map(k => users[k]);
    for (const sid of extraAlunos) {
      await query(
        `INSERT INTO class_students (class_id, student_id, active) VALUES ($1,$2,true) ON CONFLICT DO NOTHING`,
        [classes['turmaB'], sid]
      );
    }
    console.log('✅ Vínculos professor/pedagógico/aluno criados');

    // ══════════════════════════════════════════════════════════════
    // 8. NOTAS (4 bimestres, todas as disciplinas)
    // ══════════════════════════════════════════════════════════════
    const subjectIds = Object.values(subjects);
    const scoresByAluno: Record<string, number[]> = {};
    for (const sid of allAlunoIds) {
      scoresByAluno[sid] = [];
      for (const subId of subjectIds) {
        for (let b = 1; b <= 4; b++) {
          const score = Math.round((55 + Math.random() * 45) * 10) / 10;
          scoresByAluno[sid].push(score);
          await query(
            `INSERT INTO grades (student_id, class_id, subject_id, academic_year_id, bimester, score, final_score)
             VALUES ($1,$2,$3,$4,$5,$6,$6)`,
            [sid, mainClass, subId, yearId, b, score]
          );
        }
      }
    }
    console.log('✅ Notas geradas');

    // ══════════════════════════════════════════════════════════════
    // 9. CHAMADAS (últimos 15 dias úteis — 3 disciplinas)
    // ══════════════════════════════════════════════════════════════
    const attendanceSubjects = ['MAT', 'POR', 'CIE'];
    const attendanceTeachers = ['profMat', 'profPor', 'profCie'];
    const today = new Date();
    let daysAdded = 0;
    let dayOffset = 0;
    while (daysAdded < 15) {
      const d = new Date(today);
      d.setDate(today.getDate() - dayOffset);
      dayOffset++;
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split('T')[0];
      for (let s = 0; s < attendanceSubjects.length; s++) {
        const attRes = await query(
          `INSERT INTO attendance (class_id, subject_id, teacher_id, date)
           VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
          [mainClass, subjects[attendanceSubjects[s]], users[attendanceTeachers[s]], dateStr]
        );
        if (!attRes.rows.length) continue;
        const attId = attRes.rows[0].id;
        for (const sid of allAlunoIds) {
          const status = Math.random() > 0.12 ? 'presente' : 'falta';
          await query(
            `INSERT INTO attendance_records (attendance_id, student_id, status)
             VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [attId, sid, status]
          );
        }
      }
      daysAdded++;
    }
    console.log('✅ Chamadas registradas (15 dias úteis × 3 disciplinas)');

    // ══════════════════════════════════════════════════════════════
    // 10. QUESTÕES DO BANCO + ATIVIDADES
    // ══════════════════════════════════════════════════════════════

    // Questões de Matemática
    const matQuestions: string[] = [];
    const matQDefs = [
      {
        q: 'Qual é o resultado de 3/4 + 1/4?',
        alts: [{ l:'A', t:'1', c:true }, { l:'B', t:'1/2', c:false }, { l:'C', t:'2', c:false }, { l:'D', t:'3/8', c:false }],
      },
      {
        q: 'Uma fração equivalente a 2/3 é:',
        alts: [{ l:'A', t:'4/9', c:false }, { l:'B', t:'6/9', c:true }, { l:'C', t:'4/6', c:false }, { l:'D', t:'3/4', c:false }],
      },
      {
        q: 'Qual número é primo?',
        alts: [{ l:'A', t:'9', c:false }, { l:'B', t:'15', c:false }, { l:'C', t:'17', c:true }, { l:'D', t:'21', c:false }],
      },
      {
        q: 'Quanto é 25% de 200?',
        alts: [{ l:'A', t:'25', c:false }, { l:'B', t:'40', c:false }, { l:'C', t:'50', c:true }, { l:'D', t:'75', c:false }],
      },
      {
        q: 'A área de um quadrado de lado 6 cm é:',
        alts: [{ l:'A', t:'12 cm²', c:false }, { l:'B', t:'24 cm²', c:false }, { l:'C', t:'36 cm²', c:true }, { l:'D', t:'48 cm²', c:false }],
      },
    ];
    for (let i = 0; i < matQDefs.length; i++) {
      const qr = await query(
        `INSERT INTO questions (school_id, creator_id, subject_id, question_type, difficulty, bloom_level, command)
         VALUES ($1,$2,$3,'multipla_escolha','medio','aplicar',$4) RETURNING id`,
        [schoolId, users['profMat'], subjects['MAT'], matQDefs[i].q]
      );
      const qId = qr.rows[0].id;
      matQuestions.push(qId);
      for (let j = 0; j < matQDefs[i].alts.length; j++) {
        const a = matQDefs[i].alts[j];
        await query(
          `INSERT INTO question_alternatives (question_id, label, text, is_correct, order_index)
           VALUES ($1,$2,$3,$4,$5)`,
          [qId, a.l, a.t, a.c, j + 1]
        );
      }
    }

    // Questões de Português
    const porQuestions: string[] = [];
    const porQDefs = [
      {
        q: 'Qual das palavras abaixo é um substantivo?',
        alts: [{ l:'A', t:'correr', c:false }, { l:'B', t:'feliz', c:false }, { l:'C', t:'escola', c:true }, { l:'D', t:'rapidamente', c:false }],
      },
      {
        q: 'Identifique o sinônimo de "alegre":',
        alts: [{ l:'A', t:'triste', c:false }, { l:'B', t:'contente', c:true }, { l:'C', t:'bravo', c:false }, { l:'D', t:'quieto', c:false }],
      },
      {
        q: 'Qual é o plural correto de "pão"?',
        alts: [{ l:'A', t:'pãos', c:false }, { l:'B', t:'pões', c:false }, { l:'C', t:'pães', c:true }, { l:'D', t:'paes', c:false }],
      },
      {
        q: 'A palavra "sol" está grafada corretamente na frase:',
        alts: [{ l:'A', t:'O sol nasceu cedo.', c:true }, { l:'B', t:'O sol naçeu sedo.', c:false }, { l:'C', t:'O sol naçeu cedo.', c:false }, { l:'D', t:'O sol nasceu sedo.', c:false }],
      },
    ];
    for (const def of porQDefs) {
      const qr = await query(
        `INSERT INTO questions (school_id, creator_id, subject_id, question_type, difficulty, bloom_level, command)
         VALUES ($1,$2,$3,'multipla_escolha','facil','lembrar',$4) RETURNING id`,
        [schoolId, users['profPor'], subjects['POR'], def.q]
      );
      const qId = qr.rows[0].id;
      porQuestions.push(qId);
      for (let j = 0; j < def.alts.length; j++) {
        const a = def.alts[j];
        await query(
          `INSERT INTO question_alternatives (question_id, label, text, is_correct, order_index)
           VALUES ($1,$2,$3,$4,$5)`,
          [qId, a.l, a.t, a.c, j + 1]
        );
      }
    }
    console.log('✅ Questões criadas:', matQuestions.length + porQuestions.length);

    // ── Atividades ────────────────────────────────────────────
    const actDefs = [
      {
        key: 'actMat1', title: 'Atividade — Frações (1º Bimestre)',
        subKey: 'MAT', creator: 'profMat', type: 'atividade', bimester: 1,
        questions: matQuestions.slice(0, 3), score: 10,
        from: '2025-02-10T08:00:00Z', until: '2025-02-28T23:59:00Z',
      },
      {
        key: 'actMat2', title: 'Prova — Geometria (2º Bimestre)',
        subKey: 'MAT', creator: 'profMat', type: 'prova', bimester: 2,
        questions: matQuestions, score: 10,
        from: '2025-05-05T08:00:00Z', until: '2025-05-31T23:59:00Z',
      },
      {
        key: 'actPor1', title: 'Atividade — Gramática (1º Bimestre)',
        subKey: 'POR', creator: 'profPor', type: 'atividade', bimester: 1,
        questions: porQuestions, score: 10,
        from: '2025-02-15T08:00:00Z', until: '2025-03-15T23:59:00Z',
      },
      {
        key: 'actPor2', title: 'Simulado — Língua Portuguesa (3º Bimestre)',
        subKey: 'POR', creator: 'profPor', type: 'simulado', bimester: 3,
        questions: porQuestions.slice(0, 3), score: 10,
        from: '2025-08-01T08:00:00Z', until: '2025-09-30T23:59:00Z',
      },
    ];
    const activities: Record<string, string> = {};
    for (const a of actDefs) {
      const ar = await query(
        `INSERT INTO activities
           (school_id, class_id, subject_id, creator_id, grade_level_id,
            title, activity_type, bimester, academic_year_id,
            max_score, weight, time_limit_minutes,
            available_from, available_until, published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,30,$11,$12,true) RETURNING id`,
        [
          schoolId, mainClass, subjects[a.subKey], users[a.creator], grade4Id,
          a.title, a.type, a.bimester, yearId,
          a.score, a.from, a.until,
        ]
      );
      activities[a.key] = ar.rows[0].id;
      for (let i = 0; i < a.questions.length; i++) {
        await query(
          `INSERT INTO activity_questions (activity_id, question_id, order_index, score)
           VALUES ($1,$2,$3,$4)`,
          [activities[a.key], a.questions[i], i + 1, a.score / a.questions.length]
        );
      }
    }
    console.log('✅ Atividades criadas:', Object.keys(activities).length);

    // ── Respostas dos alunos (atividade 1 — concluída) ────────
    const act1Id = activities['actMat1'];
    const act1Qs = matQuestions.slice(0, 3);
    for (const sid of allAlunoIds.slice(0, 6)) {
      const arRes = await query(
        `INSERT INTO activity_results
           (activity_id, student_id, started_at, finished_at, raw_score, final_score, status, attempt_number)
         VALUES ($1,$2,'2025-02-20T09:00:00Z','2025-02-20T09:25:00Z',$3,$3,'completed',1) RETURNING id`,
        [act1Id, sid, Math.round((60 + Math.random() * 40) * 10) / 10]
      );
      const arId = arRes.rows[0].id;
      for (const qId of act1Qs) {
        const altsRes = await query(
          `SELECT id, is_correct FROM question_alternatives WHERE question_id = $1`, [qId]
        );
        const correctAlt = altsRes.rows.find((r: any) => r.is_correct);
        const wrongAlt   = altsRes.rows.find((r: any) => !r.is_correct);
        const correct = Math.random() > 0.3;
        const chosenAlt = correct ? correctAlt : wrongAlt;
        await query(
          `INSERT INTO student_responses
             (activity_id, student_id, question_id, alternative_id, is_correct, raw_score, answered_at)
           VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
          [act1Id, sid, qId, chosenAlt?.id, correct, correct ? 3.33 : 0]
        );
      }
    }
    console.log('✅ Respostas dos alunos criadas (atividade 1)');

    // ══════════════════════════════════════════════════════════════
    // 11. COMUNICADOS
    // ══════════════════════════════════════════════════════════════
    const comunicados = [
      {
        title: '🚀 Bem-vindos ao ano letivo 2025!',
        content: 'Iniciamos mais um ano de muitas descobertas e aprendizados. A missão começa agora, cosmonautas!',
        priority: 'informativo',
      },
      {
        title: '📅 Provas do 1º Bimestre',
        content: 'As provas do 1º Bimestre iniciam no dia 15/03. Consulte o calendário escolar e se prepare!',
        priority: 'urgente',
      },
      {
        title: '🎉 Semana Cultural 2025',
        content: 'Nossa Semana Cultural acontecerá entre 20 e 24 de outubro. Mais informações em breve.',
        priority: 'normal',
      },
      {
        title: '🏃 Reunião de Pais e Mestres',
        content: 'Reunião marcada para o dia 20/04 às 19h no auditório. Presença dos responsáveis obrigatória.',
        priority: 'urgente',
      },
      {
        title: '📚 Entrega de materiais didáticos',
        content: 'Os kits de materiais didáticos já estão disponíveis na secretaria. Retire até o dia 10/02.',
        priority: 'normal',
      },
    ];
    for (const c of comunicados) {
      await query(
        `INSERT INTO announcements (school_id, creator_id, title, content, priority, published, published_at)
         VALUES ($1,$2,$3,$4,$5,true,NOW())`,
        [schoolId, users['admin'], c.title, c.content, c.priority]
      );
    }
    console.log('✅ Comunicados criados:', comunicados.length);

    // ══════════════════════════════════════════════════════════════
    // 12. MATERIAIS DIDÁTICOS
    // ══════════════════════════════════════════════════════════════
    const materiais = [
      { title: 'Introdução às Frações', type: 'video', vimeo: '123456789', sub: 'MAT', b: 1, teacher: 'profMat' },
      { title: 'Geometria Plana', type: 'video', vimeo: '987654321', sub: 'MAT', b: 2, teacher: 'profMat' },
      { title: 'Porcentagem no Cotidiano', type: 'video', vimeo: '111222333', sub: 'MAT', b: 3, teacher: 'profMat' },
      { title: 'Análise Sintática — Guia Completo', type: 'pdf', s3: 'materiais/analise-sintatica.pdf', sub: 'POR', b: 1, teacher: 'profPor' },
      { title: 'Gêneros Textuais', type: 'video', vimeo: '444555666', sub: 'POR', b: 2, teacher: 'profPor' },
      { title: 'Células e Tecidos Vivos', type: 'video', vimeo: '777888999', sub: 'CIE', b: 1, teacher: 'profCie' },
      { title: 'Sistemas do Corpo Humano — Resumo', type: 'pdf', s3: 'materiais/corpo-humano.pdf', sub: 'CIE', b: 2, teacher: 'profCie' },
      { title: 'Brasil Colônia — Apostila', type: 'pdf', s3: 'materiais/brasil-colonia.pdf', sub: 'HIS', b: 1, teacher: 'profPor' },
    ];
    for (const m of materiais) {
      await query(
        `INSERT INTO materials
           (school_id, class_id, subject_id, creator_id, title, material_type, vimeo_id, s3_key, bimester, published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
        [schoolId, mainClass, subjects[m.sub], users[m.teacher],
         m.title, m.type, (m as any).vimeo || null, (m as any).s3 || null, m.b]
      );
    }
    console.log('✅ Materiais criados:', materiais.length);

    // ══════════════════════════════════════════════════════════════
    // 13. POSTS SOCIAIS
    // ══════════════════════════════════════════════════════════════
    const posts = [
      { author: 'profMat', text: '📢 Lembrete: entreguem os exercícios do capítulo 5 até sexta-feira!' },
      { author: 'alu1',    text: 'Alguém tem o resumo de Frações do bimestre 1? 🤔' },
      { author: 'profPor', text: '📚 Dica de leitura: "O Pequeno Príncipe" é leitura obrigatória para o 3º bimestre!' },
      { author: 'alu2',    text: 'Que aula incrível de Ciências hoje! Aprendi muito sobre células 🔬' },
      { author: 'ped1',    text: '🚀 Parabéns à Turma Cativante pelo excelente desempenho no 1º bimestre!' },
    ];
    const postIds: string[] = [];
    for (const p of posts) {
      const pr = await query(
        `INSERT INTO social_posts (class_id, author_id, content, status) VALUES ($1,$2,$3,'approved') RETURNING id`,
        [mainClass, users[p.author], p.text]
      );
      postIds.push(pr.rows[0].id);
    }
    // Comentários
    await query(
      `INSERT INTO social_comments (post_id, author_id, content, status) VALUES ($1,$2,$3,'approved')`,
      [postIds[1], users['alu3'], 'Eu tenho! Te mando pelo WhatsApp 😊']
    );
    await query(
      `INSERT INTO social_comments (post_id, author_id, content, status) VALUES ($1,$2,$3,'approved')`,
      [postIds[3], users['profCie'], 'Fico feliz que gostou, Bruno! Continue assim 👏']
    );
    console.log('✅ Posts sociais criados');

    // ══════════════════════════════════════════════════════════════
    // 14. DIÁRIO PEDAGÓGICO
    // ══════════════════════════════════════════════════════════════
    const todayStr = new Date().toISOString().split('T')[0];
    const diaryEntries = [
      {
        teacher: 'profMat', sub: 'MAT',
        content: 'Introdução ao conceito de frações com material concreto. Alunos participaram ativamente.',
        objectives: 'Compreender a representação de frações simples.',
        methodology: 'Aula expositiva com uso de materiais manipuláveis.',
      },
      {
        teacher: 'profPor', sub: 'POR',
        content: 'Leitura coletiva e análise de texto narrativo. Identificação de elementos da narrativa.',
        objectives: 'Identificar os elementos da narrativa em textos literários.',
        methodology: 'Leitura em voz alta, discussão em grupo e produção de resumo.',
      },
      {
        teacher: 'profCie', sub: 'CIE',
        content: 'Aula prática sobre células animais e vegetais usando microscópio.',
        objectives: 'Diferenciar células animais e vegetais.',
        methodology: 'Observação microscópica e registro em caderno de laboratório.',
      },
    ];
    for (const d of diaryEntries) {
      await query(
        `INSERT INTO pedagogical_diary (teacher_id, class_id, subject_id, date, content, objectives, methodology)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [users[d.teacher], mainClass, subjects[d.sub], todayStr, d.content, d.objectives, d.methodology]
      );
    }
    console.log('✅ Diário pedagógico criado');

    // ══════════════════════════════════════════════════════════════
    // 15. EVENTOS DO CALENDÁRIO
    // ══════════════════════════════════════════════════════════════
    const events = [
      { title: 'Início do Ano Letivo',       type: 'evento',  date: '2025-02-03' },
      { title: 'Prova de Matemática — 1ºB',  type: 'prova',   date: '2025-03-15' },
      { title: 'Prova de Português — 1ºB',   type: 'prova',   date: '2025-03-17' },
      { title: 'Reunião de Pais e Mestres',   type: 'reuniao', date: '2025-04-20' },
      { title: 'Feriado — Tiradentes',        type: 'feriado', date: '2025-04-21' },
      { title: 'Prova de Matemática — 2ºB',  type: 'prova',   date: '2025-05-20' },
      { title: 'Festa Junina',                type: 'evento',  date: '2025-06-13' },
      { title: 'Feriado — Corpus Christi',    type: 'feriado', date: '2025-06-19' },
      { title: 'Recesso Escolar',             type: 'feriado', date: '2025-07-07' },
      { title: 'Retorno das Aulas',           type: 'evento',  date: '2025-07-28' },
      { title: 'Semana da Pátria',            type: 'evento',  date: '2025-09-01' },
      { title: 'Semana Cultural 2025',        type: 'evento',  date: '2025-10-20' },
      { title: 'Prova Final — Matemática',    type: 'prova',   date: '2025-11-10' },
      { title: 'Formatura / Encerramento',    type: 'evento',  date: '2025-12-05' },
    ];
    for (const e of events) {
      await query(
        `INSERT INTO calendar_events (school_id, creator_id, title, event_type, start_datetime, all_day)
         VALUES ($1,$2,$3,$4,$5::timestamptz,true)`,
        [schoolId, users['admin'], e.title, e.type, `${e.date}T00:00:00Z`]
      );
    }
    console.log('✅ Eventos do calendário criados:', events.length);

    // ══════════════════════════════════════════════════════════════
    // 16. TRILHAS DE APRENDIZAGEM
    // ══════════════════════════════════════════════════════════════
    const trailDefs = [
      {
        title: 'Missão Frações — Do Básico ao Avançado',
        description: 'Domine frações com essa trilha progressiva. Colete Estelares a cada etapa!',
        sub: 'MAT', teacher: 'profMat', bimester: 1,
        steps: [
          { type: 'video', title: '🎬 O que são frações?', vimeo_id: '123456789', coins: 20 },
          { type: 'text',  title: '📖 Tipos de frações', content: '**Fração própria**: numerador < denominador (ex: 2/3)\n**Fração imprópria**: numerador > denominador (ex: 5/3)\n**Fração mista**: parte inteira + fração (ex: 1½)', coins: 10 },
          { type: 'video', title: '🎬 Adição e Subtração de Frações', vimeo_id: '987654321', coins: 20 },
          { type: 'pdf',   title: '📄 Lista de Exercícios', file_url: 'materiais/fracoes-lista.pdf', coins: 15, required: false },
        ],
      },
      {
        title: 'Explorando a Língua Portuguesa',
        description: 'Aprimore sua escrita e interpretação com essa trilha interativa.',
        sub: 'POR', teacher: 'profPor', bimester: 1,
        steps: [
          { type: 'video', title: '🎬 Interpretação de Texto', vimeo_id: '444555666', coins: 20 },
          { type: 'text',  title: '📖 Dicas de Leitura Ativa', content: '1. Sublinhe as ideias principais\n2. Anote palavras desconhecidas\n3. Releia parágrafos difíceis\n4. Identifique o tema central', coins: 10 },
          { type: 'video', title: '🎬 Gêneros Textuais', vimeo_id: '321654987', coins: 20 },
          { type: 'text',  title: '📖 Resumo: Figuras de Linguagem', content: 'Metáfora, comparação, personificação, hipérbole, ironia, antítese...', coins: 10 },
        ],
      },
      {
        title: 'Ciências: O Corpo Humano',
        description: 'Explore os sistemas do corpo humano nessa missão científica!',
        sub: 'CIE', teacher: 'profCie', bimester: 2,
        steps: [
          { type: 'video', title: '🎬 Células e Tecidos', vimeo_id: '777888999', coins: 20 },
          { type: 'pdf',   title: '📄 Sistemas do Corpo Humano', file_url: 'materiais/corpo-humano.pdf', coins: 15 },
          { type: 'text',  title: '📖 Resumo: Sistema Circulatório', content: 'O coração bombeia sangue através de artérias e veias. O coração tem 4 câmaras: 2 átrios e 2 ventrículos.', coins: 10 },
        ],
      },
    ];

    for (const trail of trailDefs) {
      const tr = await query(
        `INSERT INTO learning_trails
           (school_id, class_id, subject_id, creator_id, title, description, bimester, published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
        [schoolId, mainClass, subjects[trail.sub], users[trail.teacher], trail.title, trail.description, trail.bimester]
      );
      const trailId = tr.rows[0].id;
      for (let i = 0; i < trail.steps.length; i++) {
        const s = trail.steps[i] as any;
        await query(
          `INSERT INTO trail_steps (trail_id, step_order, step_type, title, vimeo_id, file_url, content, coins_reward, required)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [trailId, i + 1, s.type, s.title,
           s.vimeo_id ?? null, s.file_url ?? null, s.content ?? null,
           s.coins, s.required !== false]
        );
      }
    }
    console.log('✅ Trilhas de aprendizagem criadas:', trailDefs.length);

    // ══════════════════════════════════════════════════════════════
    // 17. GAMIFICAÇÃO — MOEDAS (Estelares)
    // ══════════════════════════════════════════════════════════════
    for (const sid of allAlunoIds) {
      const balance = Math.floor(Math.random() * 200 + 50);
      await query(
        `INSERT INTO student_coins (user_id, balance, total_earned) VALUES ($1,$2,$2)
         ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, total_earned = EXCLUDED.total_earned`,
        [sid, balance]
      );
      await query(
        `INSERT INTO coin_transactions (user_id, amount, reason, description)
         VALUES ($1,$2,'atividade','Conclusão da Atividade — Frações')`,
        [sid, balance]
      );
    }
    console.log('✅ Estelares distribuídos para os alunos');

    // ══════════════════════════════════════════════════════════════
    // 18. LOJA GALÁCTICA (Produtos)
    // ══════════════════════════════════════════════════════════════
    const products = [
      { name: 'Lápis Espacial', description: 'Lápis personalizado do Colégio Cristão', emoji: '✏️', price: 50, stock: 30 },
      { name: 'Borracha Galáctica', description: 'Borracha temática com estampas espaciais', emoji: '🔮', price: 30, stock: 50 },
      { name: 'Caderno Cosmonauta', description: 'Caderno 96 folhas com capa especial', emoji: '📒', price: 120, stock: 20 },
      { name: 'Caneta Nebulosa', description: 'Kit com 6 canetas coloridas', emoji: '🖊️', price: 80, stock: 15 },
      { name: 'Mochila Orbital', description: 'Mochila escolar com tema espacial', emoji: '🎒', price: 500, stock: 5 },
      { name: 'Adesivos Estelares', description: 'Cartela com 20 adesivos temáticos', emoji: '⭐', price: 25, stock: 100 },
      { name: '1 Dia Sem Dever', description: 'Vale 1 dia sem dever de casa (com aprovação do professor)', emoji: '🎟️', price: 200, stock: 10 },
      { name: 'Escolher a Música da Aula', description: 'Escolha a playlist da próxima aula de Ed. Física', emoji: '🎵', price: 100, stock: 20 },
    ];
    for (const p of products) {
      await query(
        `INSERT INTO store_products (school_id, name, description, image_emoji, coin_price, stock, active)
         VALUES ($1,$2,$3,$4,$5,$6,true)`,
        [schoolId, p.name, p.description, p.emoji, p.price, p.stock]
      );
    }
    console.log('✅ Produtos da Loja Galáctica criados:', products.length);

    // ══════════════════════════════════════════════════════════════
    // 19. HABILIDADES BNCC
    // ══════════════════════════════════════════════════════════════
    const bnccSkills = [
      { code: 'EF04MA01', desc: 'Ler, escrever e ordenar números naturais até a ordem dos milhões', area: 'Matemática', grade: '4º Ano', comp: 'Números e Operações' },
      { code: 'EF04MA06', desc: 'Reconhecer que as regras do sistema de numeração decimal podem ser estendidas para representar qualquer quantidade', area: 'Matemática', grade: '4º Ano', comp: 'Números e Operações' },
      { code: 'EF04MA08', desc: 'Resolver e elaborar problemas com números naturais envolvendo adição e subtração', area: 'Matemática', grade: '4º Ano', comp: 'Operações' },
      { code: 'EF04MA15', desc: 'Reconhecer as frações unitárias mais usuais como unidade de medida menor do que a unidade', area: 'Matemática', grade: '4º Ano', comp: 'Frações' },
      { code: 'EF04LP01', desc: 'Grafar palavras com correção ortográfica, apoiando-se em conhecimentos das correspondências entre grafemas e fonemas', area: 'Língua Portuguesa', grade: '4º Ano', comp: 'Ortografia' },
      { code: 'EF04LP05', desc: 'Identificar a função e as flexões de substantivos e adjetivos e detectar o efeito de sentido decorrente do uso de expressões nominais em textos lidos/escutados', area: 'Língua Portuguesa', grade: '4º Ano', comp: 'Gramática' },
      { code: 'EF04LP12', desc: 'Interpretar texto com auxílio de material gráfico diverso (propagandas, quadrinhos, tabelas etc.)', area: 'Língua Portuguesa', grade: '4º Ano', comp: 'Leitura' },
      { code: 'EF04CI01', desc: 'Identificar misturas na vida cotidiana, com base em suas propriedades físicas observáveis', area: 'Ciências', grade: '4º Ano', comp: 'Matéria e Energia' },
      { code: 'EF04CI05', desc: 'Concluir que a produção de luz artificial ocorre por transformação de energia elétrica, mecânica e química em energia luminosa', area: 'Ciências', grade: '4º Ano', comp: 'Matéria e Energia' },
      { code: 'EF04HI01', desc: 'Reconhecer a história como resultado da ação dos seres humanos no tempo e no espaço', area: 'História', grade: '4º Ano', comp: 'História' },
      { code: 'EF05MA01', desc: 'Ler, escrever e ordenar números naturais e racionais', area: 'Matemática', grade: '5º Ano', comp: 'Números e Operações' },
      { code: 'EF09MA01', desc: 'Reconhecer o caráter evolutivo das matemáticas através de uma visão histórica', area: 'Matemática', grade: '9º Ano', comp: 'Álgebra' },
    ];
    for (const sk of bnccSkills) {
      await query(
        `INSERT INTO bncc_skills (code, description, subject_area, grade_level, component)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [sk.code, sk.desc, sk.area, sk.grade, sk.comp]
      );
    }
    console.log('✅ Habilidades BNCC inseridas:', bnccSkills.length);

    // ══════════════════════════════════════════════════════════════
    // 20. RELATÓRIO FINAL — TABELA DE CREDENCIAIS
    // ══════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(90));
    console.log('🎉  SEED CONCLUÍDO COM SUCESSO!');
    console.log('═'.repeat(90));

    console.log('\n📋  TABELA DE CREDENCIAIS DE ACESSO\n');
    console.log('┌─────────────────┬────────────────────────────────────────────────┬──────────────────────┬─────────────┐');
    console.log('│ Perfil          │ E-mail                                         │ Senha                │ Cód. Perfil │');
    console.log('├─────────────────┼────────────────────────────────────────────────┼──────────────────────┼─────────────┤');

    const rows = [
      ['🌌 Super Admin',  'super@colegiocristao.edu.br',                  'Super@2025',       '—'],
      ['🏛 Admin',        'admin@colegiocristao.edu.br',                  'ADM25001@111',     'ADM25001'],
      ['🧭 Pedagógico 1', 'ana.paula@colegiocristao.edu.br',              'PED25001@222',     'PED25001'],
      ['🧭 Pedagógico 2', 'ricardo.barros@colegiocristao.edu.br',         'PED25002@333',     'PED25002'],
      ['👨‍🏫 Professor MAT', 'lucas.ferreira@colegiocristao.edu.br',        'PRO25001@444',     'PRO25001'],
      ['👨‍🏫 Professor POR', 'juliana.costa@colegiocristao.edu.br',         'PRO25002@555',     'PRO25002'],
      ['👨‍🏫 Professor CIE', 'eduardo.lima@colegiocristao.edu.br',          'PRO25003@666',     'PRO25003'],
      ['👨‍🚀 Aluno 1',      'alice@aluno.colegiocristao.edu.br',            'ALU25001@777',     'ALU25001'],
      ['👨‍🚀 Aluno 2',      'bruno@aluno.colegiocristao.edu.br',            'ALU25002@888',     'ALU25002'],
      ['👨‍🚀 Aluno 3',      'carla@aluno.colegiocristao.edu.br',            'ALU25003@999',     'ALU25003'],
      ['👨‍🚀 Aluno 4',      'diego@aluno.colegiocristao.edu.br',            'ALU25004@100',     'ALU25004'],
      ['👨‍🚀 Aluno 5',      'elena@aluno.colegiocristao.edu.br',            'ALU25005@200',     'ALU25005'],
      ['👨‍🚀 Aluno 6',      'felipe@aluno.colegiocristao.edu.br',           'ALU25006@300',     'ALU25006'],
      ['👨‍🚀 Aluno 7',      'gabriela@aluno.colegiocristao.edu.br',         'ALU25007@400',     'ALU25007'],
      ['👨‍🚀 Aluno 8',      'henrique@aluno.colegiocristao.edu.br',         'ALU25008@500',     'ALU25008'],
      ['🌍 Pais (mãe)',   'fernanda.mae@colegiocristao.edu.br',           'Controle@2025',    '—'],
      ['🌍 Pais (pai)',   'marcos.pai@colegiocristao.edu.br',             'Controle@2025',    '—'],
    ];

    for (const r of rows) {
      const p = r[0].padEnd(17);
      const e = r[1].padEnd(48);
      const s = r[2].padEnd(22);
      const c = r[3].padEnd(13);
      console.log(`│ ${p}│ ${e}│ ${s}│ ${c}│`);
    }
    console.log('└─────────────────┴────────────────────────────────────────────────┴──────────────────────┴─────────────┘');

    console.log('\n📌  DADOS CRIADOS:');
    console.log('   🏫  1 Escola: Colégio Cristão — Unidade Central');
    console.log('   👥  17 Usuários (todos os perfis)');
    console.log('   📚  3 Turmas: 4º Ano Cativante | 5º Ano Destemido | 9º Ano Explorador');
    console.log('   📖  8 Disciplinas com ícones e cores');
    console.log('   ❓  9 Questões no banco (5 MAT + 4 POR) com alternativas');
    console.log('   📝  4 Atividades publicadas (atividade, prova, simulado)');
    console.log('   📊  Notas geradas para 4 bimestres × 8 disciplinas × 8 alunos');
    console.log('   📅  Chamadas para 15 dias úteis × 3 disciplinas');
    console.log('   📢  5 Comunicados');
    console.log('   🎬  8 Materiais didáticos (vídeos e PDFs)');
    console.log('   💬  5 Posts sociais + 2 comentários');
    console.log('   📔  3 Entradas no diário pedagógico');
    console.log('   🗓  14 Eventos no calendário (provas, feriados, eventos)');
    console.log('   🛤  3 Trilhas de aprendizagem com 11 etapas');
    console.log('   🏪  8 Produtos na Loja Galáctica');
    console.log('   ⭐  Estelares distribuídos para todos os alunos');
    console.log('   🎯  12 Habilidades BNCC');
    console.log('\n' + '═'.repeat(90));

  } catch (err) {
    console.error('\n❌ Erro no seed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
