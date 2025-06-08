import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  HowToVote as VoteIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Assessment as ChartIcon,
  Block as BlockIcon,
  VerifiedUser as VerifyIcon,
  PersonAdd as PersonAddIcon,
  Monitor as MonitorIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { votingService } from '../services/votingService';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, voterInfo, refreshVoterInfo } = useAuth();
  const { contract } = useWeb3();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalVoters: 0,
    totalVotes: 0,
    totalCandidates: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await refreshVoterInfo();
        await loadStats();
      } catch (err) {
        setError('Erro ao carregar informações');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && contract) {
      loadData();
    }
  }, [user, contract]);

  const loadStats = async () => {
    try {
      if (!contract) return;
      
      // Buscar total de votos usando o mesmo método de Results.jsx
      const results = await votingService.getResults(contract);
      
      // Buscar número de candidatos
      const candidateCount = await contract.getProposalCount();
      
      // Para contar eleitores com direito de voto, precisaríamos iterar por eventos
      // Por ora, vamos mostrar apenas dados que temos certeza
      
      setStats({
        totalVoters: '-', // Não temos como contar facilmente sem eventos
        totalVotes: results.totalVotes,
        totalCandidates: Number(candidateCount)
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleVoteClick = () => {
    if (!voterInfo?.hasRightToVote) {
      setError('Você não tem permissão para votar');
      return;
    }
    if (voterInfo?.hasVoted) {
      setError('Você já votou nesta eleição');
      return;
    }
    navigate('/vote');
  };

  const handleResultsClick = () => {
    navigate('/results');
  };

  const handleVerifyClick = () => {
    navigate('/verify-vote');
  };

  const handleGrantRightsClick = () => {
    navigate('/admin/grant-rights');
  };

  const handleMonitorClick = () => {
    navigate('/admin/monitor');
  };

  const getStatusColor = (status) => {
    if (status === true) return 'success';
    if (status === false) return 'error';
    return 'default';
  };

  const getStatusIcon = (status) => {
    if (status === true) return <CheckIcon />;
    if (status === false) return <CancelIcon />;
    return <BlockIcon />;
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AdminIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Painel Administrativo
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Estatísticas Administrativas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Total de Candidatos
                </Typography>
                <Typography variant="h3" color="primary">
                  {stats.totalCandidates}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Votos Registrados
                </Typography>
                <Typography variant="h3" color="success.main">
                  {stats.totalVotes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Participação
                </Typography>
                <Typography variant="h3" color="info.main">
                  {stats.totalVotes > 0 ? `${stats.totalVotes}` : '0'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  votos computados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Status do Administrador como Eleitor */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                background: voterInfo?.hasVoted 
                  ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                  : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Seu Status de Voto
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  icon={getStatusIcon(voterInfo?.hasVoted)}
                  label={voterInfo?.hasVoted ? 'Já Votou' : 'Ainda Não Votou'}
                  color={getStatusColor(voterInfo?.hasVoted)}
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    '& .MuiChip-icon': { fontSize: '1.5rem' }
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {voterInfo?.hasVoted 
                  ? 'Você já exerceu seu direito de voto como eleitor.'
                  : 'Você ainda pode votar como eleitor.'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Informações do Administrador
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Endereço da Carteira
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                  {user?.address}
                </Typography>
                <Chip
                  label="Chairperson"
                  color="warning"
                  size="small"
                  sx={{ mt: 2 }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Ações do Eleitor */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ações como Eleitor
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<VoteIcon />}
                    onClick={handleVoteClick}
                    disabled={!voterInfo?.hasRightToVote || voterInfo?.hasVoted}
                    sx={{
                      py: 2,
                      background: !voterInfo?.hasRightToVote || voterInfo?.hasVoted
                        ? undefined
                        : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: !voterInfo?.hasRightToVote || voterInfo?.hasVoted
                        ? undefined
                        : '0 3px 5px 2px rgba(33, 203, 243, .3)',
                    }}
                  >
                    {voterInfo?.hasVoted 
                      ? 'Voto já Registrado'
                      : 'Ir para Votação'}
                  </Button>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    color="primary"
                    startIcon={<ChartIcon />}
                    onClick={handleResultsClick}
                    sx={{ py: 2 }}
                  >
                    Ver Resultados
                  </Button>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    color="success"
                    startIcon={<VerifyIcon />}
                    onClick={handleVerifyClick}
                    disabled={!voterInfo?.hasVoted}
                    sx={{ py: 2 }}
                  >
                    Verificar Meu Voto
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Ações Administrativas */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3, bgcolor: 'rgba(255, 167, 38, 0.08)' }}>
              <Typography variant="h6" gutterBottom color="warning.dark">
                Ações Administrativas
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    color="warning"
                    startIcon={<PersonAddIcon />}
                    onClick={handleGrantRightsClick}
                    sx={{ py: 2 }}
                  >
                    Conceder Direito de Voto
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }} align="center">
                    Autorizar novos eleitores a votar
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    color="warning"
                    startIcon={<MonitorIcon />}
                    onClick={handleMonitorClick}
                    sx={{ py: 2 }}
                  >
                    Monitorar Blockchain
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }} align="center">
                    Acompanhar blocos e transações em tempo real
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default AdminDashboard;