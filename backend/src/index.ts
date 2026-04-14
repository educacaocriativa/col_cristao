import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import turmasRoutes from './routes/turmas';
import alunosRoutes from './routes/alunos';
import atividadesRoutes from './routes/atividades';
import materiaisRoutes from './routes/materiais';
import comunicadosRoutes from './routes/comunicados';
import socialRoutes from './routes/social';
import diarioRoutes from './routes/diario';
import calendarRoutes from './routes/calendar';
import relatoriosRoutes from './routes/relatorios';
import usuariosRoutes from './routes/usuarios';
import trilhasRoutes from './routes/trilhas';
import coinsRoutes from './routes/coins';
import lojaRoutes from './routes/loja';
import schoolsRoutes from './routes/schools';
import bnccRoutes from './routes/bncc';
import subjectsRoutes from './routes/subjects';
import scheduleRoutes from './routes/schedule';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/turmas', turmasRoutes);
app.use('/api/alunos', alunosRoutes);
app.use('/api/atividades', atividadesRoutes);
app.use('/api/materiais', materiaisRoutes);
app.use('/api/comunicados', comunicadosRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/diario', diarioRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/trilhas', trilhasRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/loja', lojaRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/bncc', bnccRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/schedule', scheduleRoutes);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Colégio Cristão iniciado na porta ${PORT}`);
});

export default app;
