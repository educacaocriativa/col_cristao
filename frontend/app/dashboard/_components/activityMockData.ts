// ============================================================
// DADOS MOCK — ATIVIDADES COM QUESTÕES (todos os tipos)
// ============================================================

export type QuestionType =
  | "multipla_escolha"
  | "verdadeiro_falso"
  | "ligar"
  | "arrastar"
  | "selecionar_imagem";

export interface Alternative {
  id: string;
  label: string;       // A, B, C, D, E
  text: string;
  isCorrect: boolean;
  partialScore: number; // 0, 0.25, 0.5, 0.75, 1.0
}

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  difficulty: "facil" | "medio" | "dificil";
  bloomLevel: string;
  bnccCode: string;
  context?: string;       // Texto de apoio/contextualização
  command: string;        // Enunciado da questão
  mediaUrl?: string;
  score: number;          // Peso da questão
  // Múltipla escolha / V ou F
  alternatives?: Alternative[];
  // Ligar
  matchPairs?: MatchPair[];
  // Arrastar palavras — command tem __BLANK__ onde cabe a palavra
  dragWords?: string[];
  correctDragOrder?: string[];
  // Selecionar imagem
  imageOptions?: { id: string; url: string; label: string; isCorrect: boolean }[];
}

export interface FullActivity {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  type: "prova" | "atividade" | "simulado" | "tarefa";
  bimester: number;
  maxScore: number;
  timeLimitMinutes?: number;
  availableUntil: string;
  instructions: string;
  questions: Question[];
}

// ---- BANCO DE QUESTÕES MOCK ----
export const FULL_ACTIVITIES: Record<string, FullActivity> = {
  a1: {
    id: "a1",
    title: "Lista de Exercícios — Frações",
    subject: "Matemática",
    subjectColor: "#3b82f6",
    type: "atividade",
    bimester: 1,
    maxScore: 100,
    timeLimitMinutes: 45,
    availableUntil: "2026-04-04T23:59:00",
    instructions: "Leia cada questão com atenção. Você tem 45 minutos para concluir esta expedição. As questões valem pontos diferentes de acordo com a dificuldade.",
    questions: [
      {
        id: "q1",
        type: "multipla_escolha",
        difficulty: "facil",
        bloomLevel: "Compreensão",
        bnccCode: "EF04MA08",
        context: "Ana tem uma pizza dividida em 8 partes iguais. Ela comeu 3 partes.",
        command: "Qual fração da pizza Ana comeu?",
        score: 20,
        alternatives: [
          { id: "a", label: "A", text: "3/8",  isCorrect: true,  partialScore: 1.0 },
          { id: "b", label: "B", text: "8/3",  isCorrect: false, partialScore: 0.0 },
          { id: "c", label: "C", text: "3/5",  isCorrect: false, partialScore: 0.25 },
          { id: "d", label: "D", text: "5/8",  isCorrect: false, partialScore: 0.5  },
        ],
      },
      {
        id: "q2",
        type: "multipla_escolha",
        difficulty: "medio",
        bloomLevel: "Aplicação",
        bnccCode: "EF04MA09",
        context: "Em uma turma, 2/5 dos alunos gostam de matemática e 1/5 gostam de ciências.",
        command: "Qual é a fração total de alunos que gostam de matemática OU ciências?",
        score: 25,
        alternatives: [
          { id: "a", label: "A", text: "3/5",  isCorrect: true,  partialScore: 1.0 },
          { id: "b", label: "B", text: "2/10", isCorrect: false, partialScore: 0.5  },
          { id: "c", label: "C", text: "3/10", isCorrect: false, partialScore: 0.25 },
          { id: "d", label: "D", text: "2/5",  isCorrect: false, partialScore: 0.0  },
        ],
      },
      {
        id: "q3",
        type: "verdadeiro_falso",
        difficulty: "facil",
        bloomLevel: "Conhecimento",
        bnccCode: "EF04MA07",
        command: "A fração 4/4 é igual ao número inteiro 1.",
        score: 15,
        alternatives: [
          { id: "v", label: "V", text: "Verdadeiro", isCorrect: true,  partialScore: 1.0 },
          { id: "f", label: "F", text: "Falso",      isCorrect: false, partialScore: 0.0 },
        ],
      },
      {
        id: "q4",
        type: "ligar",
        difficulty: "medio",
        bloomLevel: "Análise",
        bnccCode: "EF04MA08",
        command: "Ligue cada fração à sua representação decimal correta.",
        score: 20,
        matchPairs: [
          { id: "p1", left: "1/2",   right: "0,50" },
          { id: "p2", left: "1/4",   right: "0,25" },
          { id: "p3", left: "3/4",   right: "0,75" },
          { id: "p4", left: "1/10",  right: "0,10" },
        ],
      },
      {
        id: "q5",
        type: "arrastar",
        difficulty: "dificil",
        bloomLevel: "Síntese",
        bnccCode: "EF04MA09",
        command: "Complete a sequência de frações equivalentes arrastando os números corretos para os espaços:",
        context: "1/2 = __BLANK__/4 = 3/__BLANK__ = __BLANK__/8",
        score: 20,
        dragWords: ["2", "4", "6", "3", "8", "5"],
        correctDragOrder: ["2", "6", "4"],
      },
    ],
  },

  a2: {
    id: "a2",
    title: "Interpretação de Texto — Conto Moderno",
    subject: "Língua Portuguesa",
    subjectColor: "#8b5cf6",
    type: "atividade",
    bimester: 1,
    maxScore: 100,
    timeLimitMinutes: 60,
    availableUntil: "2026-04-05T23:59:00",
    instructions: "Leia o texto com atenção antes de responder. As questões testam sua compreensão, interpretação e análise do texto.",
    questions: [
      {
        id: "q1",
        type: "multipla_escolha",
        difficulty: "facil",
        bloomLevel: "Compreensão",
        bnccCode: "EF04LP01",
        context: `A menina e o espelho\n\nCerta manhã, Clara acordou e foi ao banheiro lavar o rosto. Ao se olhar no espelho, não reconheceu sua própria imagem. No lugar de seus cabelos castanhos, havia cachos dourados. Seus olhos, antes verdes, agora brilhavam em azul profundo.\n— Quem é você? — ela perguntou ao reflexo.\n— Sou quem você sempre quis ser — respondeu a imagem, sorrindo.\nClara recuou assustada. Mas, ao fechar e reabrir os olhos, estava de volta ao normal — ela mesma, com seus cabelos castanhos e olhos verdes.\n— Que sonho estranho — murmurou. Mas estava de pé, e não deitada.`,
        command: "Qual é o elemento que indica que o evento do espelho pode ter sido real, e não um sonho?",
        score: 20,
        alternatives: [
          { id: "a", label: "A", text: "Clara viu uma imagem diferente no espelho",          isCorrect: false, partialScore: 0.5  },
          { id: "b", label: "B", text: "Ela estava de pé ao 'acordar', não deitada na cama", isCorrect: true,  partialScore: 1.0 },
          { id: "c", label: "C", text: "A imagem do espelho falou com ela",                  isCorrect: false, partialScore: 0.25 },
          { id: "d", label: "D", text: "Seus olhos mudaram de cor",                          isCorrect: false, partialScore: 0.0  },
        ],
      },
      {
        id: "q2",
        type: "verdadeiro_falso",
        difficulty: "facil",
        bloomLevel: "Conhecimento",
        bnccCode: "EF04LP02",
        command: "No conto, a imagem do espelho disse que era quem Clara sempre quis ser.",
        score: 15,
        alternatives: [
          { id: "v", label: "V", text: "Verdadeiro", isCorrect: true,  partialScore: 1.0 },
          { id: "f", label: "F", text: "Falso",      isCorrect: false, partialScore: 0.0 },
        ],
      },
      {
        id: "q3",
        type: "multipla_escolha",
        difficulty: "medio",
        bloomLevel: "Análise",
        bnccCode: "EF04LP05",
        command: "Qual é o tema central do conto?",
        score: 25,
        alternatives: [
          { id: "a", label: "A", text: "O medo de espelhos e reflexos",           isCorrect: false, partialScore: 0.0  },
          { id: "b", label: "B", text: "A busca por uma identidade diferente",    isCorrect: true,  partialScore: 1.0 },
          { id: "c", label: "C", text: "Um sonho lúcido vivido pela personagem",  isCorrect: false, partialScore: 0.5  },
          { id: "d", label: "D", text: "A magia presente nos objetos cotidianos", isCorrect: false, partialScore: 0.25 },
        ],
      },
      {
        id: "q4",
        type: "ligar",
        difficulty: "medio",
        bloomLevel: "Compreensão",
        bnccCode: "EF04LP03",
        command: "Ligue cada trecho do conto à sua função narrativa:",
        score: 20,
        matchPairs: [
          { id: "p1", left: "\"Certa manhã, Clara acordou\"",      right: "Situação inicial" },
          { id: "p2", left: "\"não reconheceu sua própria imagem\"", right: "Conflito"       },
          { id: "p3", left: "\"ao fechar e reabrir os olhos\"",    right: "Resolução"        },
          { id: "p4", left: "\"Mas estava de pé\"",                right: "Desfecho ambíguo" },
        ],
      },
      {
        id: "q5",
        type: "arrastar",
        difficulty: "dificil",
        bloomLevel: "Aplicação",
        bnccCode: "EF04LP04",
        command: "Complete a análise do texto arrastando as palavras corretas:",
        context: "O conto usa elementos do __BLANK__ realismo para criar uma atmosfera __BLANK__. A personagem principal vive um momento de __BLANK__ sobre sua identidade.",
        score: 20,
        dragWords: ["mágico", "sombria", "crise", "alegre", "científico", "certeza"],
        correctDragOrder: ["mágico", "sombria", "crise"],
      },
    ],
  },

  a6: {
    id: "a6",
    title: "Vocabulário e Gramática — Unit 5",
    subject: "Inglês",
    subjectColor: "#6366f1",
    type: "atividade",
    bimester: 1,
    maxScore: 100,
    timeLimitMinutes: 30,
    availableUntil: "2026-04-03T23:59:00",
    instructions: "Read each question carefully. Choose the best answer.",
    questions: [
      {
        id: "q1",
        type: "multipla_escolha",
        difficulty: "facil",
        bloomLevel: "Knowledge",
        bnccCode: "EF04LI01",
        command: "Choose the correct translation for 'biblioteca':",
        score: 25,
        alternatives: [
          { id: "a", label: "A", text: "bookstore", isCorrect: false, partialScore: 0.5  },
          { id: "b", label: "B", text: "library",   isCorrect: true,  partialScore: 1.0 },
          { id: "c", label: "C", text: "laboratory", isCorrect: false, partialScore: 0.0 },
          { id: "d", label: "D", text: "bedroom",   isCorrect: false, partialScore: 0.0 },
        ],
      },
      {
        id: "q2",
        type: "verdadeiro_falso",
        difficulty: "facil",
        bloomLevel: "Knowledge",
        bnccCode: "EF04LI02",
        command: "The verb 'to be' in the sentence \"She is a teacher\" is correctly conjugated.",
        score: 25,
        alternatives: [
          { id: "v", label: "V", text: "True",  isCorrect: true,  partialScore: 1.0 },
          { id: "f", label: "F", text: "False", isCorrect: false, partialScore: 0.0 },
        ],
      },
      {
        id: "q3",
        type: "ligar",
        difficulty: "medio",
        bloomLevel: "Comprehension",
        bnccCode: "EF04LI03",
        command: "Match the English word to its Portuguese translation:",
        score: 25,
        matchPairs: [
          { id: "p1", left: "School",   right: "Escola"    },
          { id: "p2", left: "Teacher",  right: "Professor" },
          { id: "p3", left: "Student",  right: "Aluno"     },
          { id: "p4", left: "Classroom",right: "Sala de aula" },
        ],
      },
      {
        id: "q4",
        type: "arrastar",
        difficulty: "medio",
        bloomLevel: "Application",
        bnccCode: "EF04LI04",
        command: "Complete the sentence by dragging the correct words:",
        context: "My name __BLANK__ Lucas. I __BLANK__ a student. I __BLANK__ at Colégio Cristão.",
        score: 25,
        dragWords: ["is", "am", "are", "study", "studies"],
        correctDragOrder: ["is", "am", "study"],
      },
    ],
  },
};
