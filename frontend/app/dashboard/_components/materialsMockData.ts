// ============================================================
// DADOS MOCK — MATERIAIS (Videoaulas + PDFs)
// ============================================================

export interface VideoLesson {
  id: string;
  title: string;
  vimeoId: string;   // Vimeo video ID (placeholder)
  duration: string;  // "12:34"
  topic: string;
  bimester: number;
  watched: boolean;
  date: string;
}

export interface PDFMaterial {
  id: string;
  title: string;
  s3Key: string;     // S3 object key (placeholder)
  pages: number;
  topic: string;
  bimester: number;
  downloaded: boolean;
  date: string;
  sizeKb: number;
}

export interface SubjectMaterials {
  videos: VideoLesson[];
  pdfs: PDFMaterial[];
}

export const SUBJECT_MATERIALS: Record<string, SubjectMaterials> = {
  mat: {
    videos: [
      { id: "v1", title: "Introdução às Frações",         vimeoId: "824637892", duration: "14:22", topic: "Frações",           bimester: 1, watched: true,  date: "2026-03-10" },
      { id: "v2", title: "Frações Equivalentes",          vimeoId: "824637893", duration: "11:08", topic: "Frações",           bimester: 1, watched: true,  date: "2026-03-12" },
      { id: "v3", title: "Adição de Frações",             vimeoId: "824637894", duration: "16:45", topic: "Frações",           bimester: 1, watched: false, date: "2026-03-17" },
      { id: "v4", title: "Subtração de Frações",          vimeoId: "824637895", duration: "13:30", topic: "Frações",           bimester: 1, watched: false, date: "2026-03-19" },
      { id: "v5", title: "Números Decimais — Parte 1",    vimeoId: "824637896", duration: "18:00", topic: "Decimais",          bimester: 2, watched: false, date: "2026-03-24" },
      { id: "v6", title: "Números Decimais — Parte 2",    vimeoId: "824637897", duration: "15:15", topic: "Decimais",          bimester: 2, watched: false, date: "2026-03-26" },
      { id: "v7", title: "Multiplicação de Decimais",     vimeoId: "824637898", duration: "12:50", topic: "Decimais",          bimester: 2, watched: false, date: "2026-03-31" },
      { id: "v8", title: "Problemas com Frações e Dec.",  vimeoId: "824637899", duration: "20:10", topic: "Resolução Problemas",bimester: 2, watched: false, date: "2026-04-01" },
    ],
    pdfs: [
      { id: "p1", title: "Apostila — Frações (1º Bim.)",  s3Key: "mat/apostila-fracoes-b1.pdf",   pages: 24, topic: "Frações",  bimester: 1, downloaded: true,  date: "2026-03-08", sizeKb: 1240 },
      { id: "p2", title: "Lista de Exercícios — Frações", s3Key: "mat/lista-fracoes.pdf",         pages:  8, topic: "Frações",  bimester: 1, downloaded: true,  date: "2026-03-15", sizeKb:  340 },
      { id: "p3", title: "Gabarito — Lista Frações",      s3Key: "mat/gabarito-fracoes.pdf",      pages:  4, topic: "Frações",  bimester: 1, downloaded: false, date: "2026-03-22", sizeKb:  180 },
      { id: "p4", title: "Apostila — Decimais (2º Bim.)", s3Key: "mat/apostila-decimais-b2.pdf",  pages: 28, topic: "Decimais", bimester: 2, downloaded: false, date: "2026-03-25", sizeKb: 1580 },
    ],
  },
  por: {
    videos: [
      { id: "v1", title: "Interpretação Textual — Técnicas",   vimeoId: "825000001", duration: "17:30", topic: "Interpretação", bimester: 1, watched: true,  date: "2026-03-09" },
      { id: "v2", title: "Tipos de Texto — Narrativo",         vimeoId: "825000002", duration: "13:45", topic: "Gêneros",       bimester: 1, watched: true,  date: "2026-03-11" },
      { id: "v3", title: "Tipos de Texto — Argumentativo",     vimeoId: "825000003", duration: "15:20", topic: "Gêneros",       bimester: 1, watched: false, date: "2026-03-16" },
      { id: "v4", title: "Coesão e Coerência",                 vimeoId: "825000004", duration: "19:00", topic: "Redação",       bimester: 1, watched: false, date: "2026-03-18" },
      { id: "v5", title: "Pontuação — Vírgula",                vimeoId: "825000005", duration: "11:15", topic: "Gramática",     bimester: 1, watched: false, date: "2026-03-23" },
      { id: "v6", title: "Pontuação — Ponto e Ponto e Vírgula",vimeoId: "825000006", duration: "10:40", topic: "Gramática",     bimester: 1, watched: false, date: "2026-03-25" },
      { id: "v7", title: "Substantivos e Adjetivos",           vimeoId: "825000007", duration: "14:55", topic: "Morfologia",    bimester: 2, watched: false, date: "2026-03-30" },
      { id: "v8", title: "Verbos — Tempos Verbais",            vimeoId: "825000008", duration: "22:10", topic: "Morfologia",    bimester: 2, watched: false, date: "2026-04-01" },
    ],
    pdfs: [
      { id: "p1", title: "Apostila de Interpretação",     s3Key: "por/apostila-interpretacao.pdf", pages: 32, topic: "Interpretação", bimester: 1, downloaded: true,  date: "2026-03-07", sizeKb: 1820 },
      { id: "p2", title: "Coletânea de Textos — Conto",   s3Key: "por/coletanea-contos.pdf",       pages: 18, topic: "Gêneros",       bimester: 1, downloaded: false, date: "2026-03-14", sizeKb:  920 },
      { id: "p3", title: "Gramática — Guia Rápido",       s3Key: "por/gramatica-guia.pdf",         pages: 12, topic: "Gramática",     bimester: 1, downloaded: false, date: "2026-03-21", sizeKb:  540 },
    ],
  },
  cie: {
    videos: [
      { id: "v1", title: "Células — Estrutura Básica",    vimeoId: "825100001", duration: "16:40", topic: "Células",    bimester: 1, watched: false, date: "2026-03-10" },
      { id: "v2", title: "Fotossíntese e Respiração",     vimeoId: "825100002", duration: "18:55", topic: "Plantas",    bimester: 1, watched: false, date: "2026-03-17" },
      { id: "v3", title: "Cadeias Alimentares",           vimeoId: "825100003", duration: "13:20", topic: "Ecologia",   bimester: 1, watched: false, date: "2026-03-24" },
      { id: "v4", title: "Sistema Solar",                 vimeoId: "825100004", duration: "21:00", topic: "Astronomia", bimester: 2, watched: false, date: "2026-03-31" },
      { id: "v5", title: "A Terra e seus movimentos",     vimeoId: "825100005", duration: "14:30", topic: "Astronomia", bimester: 2, watched: false, date: "2026-04-01" },
      { id: "v6", title: "Misturas e Substâncias",        vimeoId: "825100006", duration: "11:45", topic: "Química",    bimester: 2, watched: false, date: "2026-04-07" },
    ],
    pdfs: [
      { id: "p1", title: "Apostila — Seres Vivos",        s3Key: "cie/apostila-seres-vivos.pdf", pages: 20, topic: "Biologia",  bimester: 1, downloaded: false, date: "2026-03-09", sizeKb: 1100 },
      { id: "p2", title: "Mapa Mental — Ecossistemas",    s3Key: "cie/mapa-ecossistemas.pdf",    pages:  6, topic: "Ecologia",   bimester: 1, downloaded: false, date: "2026-03-16", sizeKb:  380 },
      { id: "p3", title: "Apostila — Astronomia",         s3Key: "cie/apostila-astronomia.pdf",  pages: 16, topic: "Astronomia", bimester: 2, downloaded: false, date: "2026-03-30", sizeKb:  870 },
    ],
  },
  his: {
    videos: [
      { id: "v1", title: "Brasil Colonial — Introdução",  vimeoId: "825200001", duration: "19:15", topic: "Brasil Colonial", bimester: 1, watched: false, date: "2026-03-09" },
      { id: "v2", title: "Ciclo do Ouro",                 vimeoId: "825200002", duration: "15:40", topic: "Brasil Colonial", bimester: 1, watched: false, date: "2026-03-16" },
      { id: "v3", title: "Independência do Brasil",       vimeoId: "825200003", duration: "22:00", topic: "Império",         bimester: 1, watched: false, date: "2026-03-23" },
      { id: "v4", title: "Brasil Império — D. Pedro I",   vimeoId: "825200004", duration: "17:30", topic: "Império",         bimester: 2, watched: false, date: "2026-03-30" },
      { id: "v5", title: "República Velha",               vimeoId: "825200005", duration: "20:45", topic: "República",       bimester: 2, watched: false, date: "2026-04-06" },
    ],
    pdfs: [
      { id: "p1", title: "Linha do Tempo — Brasil",       s3Key: "his/linha-tempo-brasil.pdf",  pages: 10, topic: "Geral",          bimester: 1, downloaded: false, date: "2026-03-08", sizeKb: 620 },
      { id: "p2", title: "Apostila — Brasil Colonial",    s3Key: "his/apostila-colonial.pdf",   pages: 26, topic: "Brasil Colonial", bimester: 1, downloaded: false, date: "2026-03-15", sizeKb: 1430 },
    ],
  },
  geo: {
    videos: [
      { id: "v1", title: "Cartografia — Mapas e Escalas", vimeoId: "825300001", duration: "15:00", topic: "Cartografia", bimester: 1, watched: false, date: "2026-03-11" },
      { id: "v2", title: "Relevo Brasileiro",              vimeoId: "825300002", duration: "17:20", topic: "Relevo",      bimester: 1, watched: false, date: "2026-03-18" },
      { id: "v3", title: "Climas do Brasil",               vimeoId: "825300003", duration: "13:55", topic: "Clima",       bimester: 1, watched: false, date: "2026-03-25" },
      { id: "v4", title: "Biomas Brasileiros",             vimeoId: "825300004", duration: "21:10", topic: "Biomas",      bimester: 2, watched: false, date: "2026-04-01" },
    ],
    pdfs: [
      { id: "p1", title: "Atlas Geográfico — Excertos",   s3Key: "geo/atlas-excertos.pdf",       pages: 14, topic: "Cartografia", bimester: 1, downloaded: false, date: "2026-03-10", sizeKb: 2100 },
      { id: "p2", title: "Apostila — Relevo e Clima",     s3Key: "geo/apostila-relevo-clima.pdf", pages: 22, topic: "Relevo",      bimester: 1, downloaded: false, date: "2026-03-17", sizeKb: 1280 },
    ],
  },
  ing: {
    videos: [
      { id: "v1", title: "Verb To Be — Present",          vimeoId: "825400001", duration: "10:30", topic: "Grammar",  bimester: 1, watched: true,  date: "2026-03-09" },
      { id: "v2", title: "Simple Present",                 vimeoId: "825400002", duration: "14:15", topic: "Grammar",  bimester: 1, watched: true,  date: "2026-03-16" },
      { id: "v3", title: "Vocabulary — School",            vimeoId: "825400003", duration: "09:40", topic: "Vocabulary",bimester: 1, watched: false, date: "2026-03-23" },
      { id: "v4", title: "Simple Past — Regular Verbs",    vimeoId: "825400004", duration: "16:00", topic: "Grammar",  bimester: 2, watched: false, date: "2026-03-30" },
      { id: "v5", title: "Reading — Short Stories",        vimeoId: "825400005", duration: "12:20", topic: "Reading",  bimester: 2, watched: false, date: "2026-04-06" },
    ],
    pdfs: [
      { id: "p1", title: "Workbook Unit 4 & 5",           s3Key: "ing/workbook-u4-u5.pdf",   pages: 16, topic: "Mixed",    bimester: 1, downloaded: true,  date: "2026-03-08", sizeKb: 780 },
      { id: "p2", title: "Grammar Reference Guide",        s3Key: "ing/grammar-reference.pdf", pages:  8, topic: "Grammar", bimester: 1, downloaded: false, date: "2026-03-15", sizeKb: 320 },
    ],
  },
  art: {
    videos: [
      { id: "v1", title: "Arte Rupestre e Pré-História",   vimeoId: "825500001", duration: "12:00", topic: "História da Arte", bimester: 1, watched: false, date: "2026-03-13" },
      { id: "v2", title: "Arte Brasileira Moderna",        vimeoId: "825500002", duration: "18:30", topic: "Arte Brasileira",  bimester: 1, watched: false, date: "2026-03-20" },
      { id: "v3", title: "Técnicas de Desenho",            vimeoId: "825500003", duration: "14:50", topic: "Técnicas",         bimester: 2, watched: false, date: "2026-03-27" },
    ],
    pdfs: [
      { id: "p1", title: "Guia — Movimentos Artísticos",  s3Key: "art/guia-movimentos.pdf",  pages: 18, topic: "História da Arte", bimester: 1, downloaded: false, date: "2026-03-12", sizeKb: 1950 },
      { id: "p2", title: "Atividade — Releitura de Obra",  s3Key: "art/ativ-releitura.pdf",   pages:  4, topic: "Técnicas",         bimester: 1, downloaded: false, date: "2026-03-19", sizeKb:  210 },
    ],
  },
  edf: {
    videos: [
      { id: "v1", title: "Regras do Futebol",              vimeoId: "825600001", duration: "08:30", topic: "Esportes Coletivos", bimester: 1, watched: false, date: "2026-03-10" },
      { id: "v2", title: "Alongamento e Aquecimento",      vimeoId: "825600002", duration: "11:00", topic: "Saúde",              bimester: 1, watched: false, date: "2026-03-17" },
    ],
    pdfs: [
      { id: "p1", title: "Apostila — Saúde e Qualidade",  s3Key: "edf/saude-qualidade.pdf",   pages: 12, topic: "Saúde",  bimester: 1, downloaded: false, date: "2026-03-09", sizeKb: 560 },
    ],
  },
};

// ── Social feed ───────────────────────────────────────────────
export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  authorRole: "aluno" | "professor" | "pedagogico" | "admin";
  content: string;
  date: string;
  likes: number;
  likedByMe: boolean;
  comments: SocialComment[];
  moderated: boolean;
  pinned: boolean;
}

export interface SocialComment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorRole: "aluno" | "professor" | "pedagogico" | "admin";
  content: string;
  date: string;
}

export const MOCK_POSTS: SocialPost[] = [
  {
    id: "post1",
    authorId: "demo-professor",
    authorName: "Prof. Roberto Silva",
    authorInitials: "RS",
    authorRole: "professor",
    content: "🚀 Cosmonautas! A lista de exercícios de frações já está disponível na seção Expedições. Prazo até sexta! Qualquer dúvida, postem aqui no canal.",
    date: "2026-04-02T10:30:00",
    likes: 12,
    likedByMe: false,
    pinned: true,
    moderated: false,
    comments: [
      { id: "c1", authorName: "Alice Fernandes", authorInitials: "AF", authorRole: "aluno", content: "Professor, a questão 4 da lista eu não entendi. Pode explicar?", date: "2026-04-02T11:15:00" },
      { id: "c2", authorName: "Prof. Roberto Silva", authorInitials: "RS", authorRole: "professor", content: "Claro, Alice! Vou gravar um vídeo curto explicando esse ponto hoje à tarde. 😊", date: "2026-04-02T11:45:00" },
    ],
  },
  {
    id: "post2",
    authorId: "demo-aluno",
    authorName: "Alice Fernandes",
    authorInitials: "AF",
    authorRole: "aluno",
    content: "Alguém mais achou a questão 5 da atividade de matemática muito difícil? Eu fiz de um jeito mas não tenho certeza se está certo 😅",
    date: "2026-04-02T09:00:00",
    likes: 8,
    likedByMe: true,
    pinned: false,
    moderated: false,
    comments: [
      { id: "c3", authorName: "Bruno Carvalho", authorInitials: "BC", authorRole: "aluno", content: "Também achei difícil! Tentei mas não sei se está correto", date: "2026-04-02T09:30:00" },
    ],
  },
  {
    id: "post3",
    authorId: "demo-pedagogico",
    authorName: "Carla Mendes",
    authorInitials: "CM",
    authorRole: "pedagogico",
    content: "📢 Lembramos que a Reunião de Pais e Mestres será no próximo sábado às 9h. Tragam a caderneta de acompanhamento!",
    date: "2026-04-01T14:00:00",
    likes: 25,
    likedByMe: false,
    pinned: true,
    moderated: false,
    comments: [],
  },
  {
    id: "post4",
    authorId: "s3",
    authorName: "Camila Santos",
    authorInitials: "CS",
    authorRole: "aluno",
    content: "Terminei a atividade de Inglês e achei bem tranquila! As questões de vocabulário foram as mais fáceis. Bora, pessoal! 💪",
    date: "2026-04-01T20:00:00",
    likes: 5,
    likedByMe: false,
    pinned: false,
    moderated: false,
    comments: [],
  },
];
