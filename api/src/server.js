const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const blockchainService = require('./services/blockchainService');
const authorizationRoutes = require('./routes/authorization');
const votingRoutes = require('./routes/voting');

const app = express();
const PORT = process.env.PORT || 3001;

// ======================== MIDDLEWARES ========================

app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Muitas requisições. Tente novamente mais tarde.'
});
app.use('/api/', limiter);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ======================== ROTAS ========================

app.get('/', (req, res) => {
  res.json({
    message: 'Blockchain Voting API',
    version: '1.0.0',
    status: 'operational'
  });
});

app.use('/api/authorization', authorizationRoutes);
app.use('/api/voting', votingRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada'
  });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor'
  });
});

// ======================== INICIALIZAÇÃO ========================

async function startServer() {
  try {
    console.log('\n=== Iniciando API de Votação Blockchain ===\n');

    // Inicializar serviço blockchain
    await blockchainService.initialize();

    // Verificar fase
    const phase = await blockchainService.getCurrentPhase();
    console.log(`✅ Fase atual: ${phase.phaseName}\n`);

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`✅ API rodando na porta ${PORT}`);
      console.log(`   http://localhost:${PORT}`);
      console.log(`\n📋 Endpoints disponíveis:`);
      console.log(`\n   🔐 Autorização:`);
      console.log(`   POST   /api/authorization/validate-cpf`);
      console.log(`   POST   /api/authorization/register`);
      console.log(`   GET    /api/authorization/stats`);
      console.log(`   GET    /api/authorization/health`);
      console.log(`\n   🗳️  Votação:`);
      console.log(`   POST   /api/voting/authenticate`);
      console.log(`   POST   /api/voting/submit`);
      console.log(`   GET    /api/voting/verify/:address`);
      console.log(`   GET    /api/voting/search/:txHash`);
      console.log(`   GET    /api/voting/results`);
      console.log(`\n=== Sistema pronto ===\n`);
    });

  } catch (error) {
    console.error('\n❌ Falha ao iniciar:', error.message);
    process.exit(1);
  }
}

startServer();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;