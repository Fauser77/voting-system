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
} from '@mui/material';
import {
  HowToVote as VoteIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Assessment as ChartIcon,
  Block as BlockIcon,
  VerifiedUser as VerifyIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';

const VoterDashboard = () => {
  const navigate = useNavigate();
  const { user, voterInfo, refreshVoterInfo } = useAuth();
  const { contract } = useWeb3();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await refreshVoterInfo();
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
  }, [user, contract]); // Removido refreshVoterInfo das dependências

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
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Painel do Eleitor
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Card de Status */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                background: voterInfo?.hasVoted 
                  ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                  : voterInfo?.hasRightToVote
                  ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                  : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Status do Voto
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
                  ? 'Seu voto foi registrado com sucesso na blockchain.'
                  : 'Você ainda não registrou seu voto nesta eleição.'}
              </Typography>
            </Paper>
          </Grid>

          {/* Card de Permissão */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                background: voterInfo?.hasRightToVote
                  ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                  : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
              }}
            >
              <Typography variant="h6" gutterBottom>
                Permissão de Voto
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  icon={getStatusIcon(voterInfo?.hasRightToVote)}
                  label={voterInfo?.hasRightToVote ? 'Autorizado' : 'Não Autorizado'}
                  color={getStatusColor(voterInfo?.hasRightToVote)}
                  sx={{ 
                    fontWeight: 'bold',
                    '& .MuiChip-icon': { fontSize: '1.5rem' }
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {voterInfo?.hasRightToVote 
                  ? 'Você está autorizado a votar nesta eleição.'
                  : 'Você ainda não tem permissão para votar. Entre em contato com o administrador.'}
              </Typography>
            </Paper>
          </Grid>

          {/* Informações do Eleitor */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Informações do Eleitor
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Endereço da Carteira
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                  {user?.address}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Ações */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Ações Disponíveis
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
                      : !voterInfo?.hasRightToVote
                      ? 'Sem Permissão para Votar'
                      : 'Ir para Votação'}
                  </Button>
                  {voterInfo?.hasVoted && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }} align="center">
                      Você já exerceu seu direito de voto
                    </Typography>
                  )}
                  {!voterInfo?.hasRightToVote && !voterInfo?.hasVoted && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }} align="center" color="error">
                      Solicite permissão ao administrador
                    </Typography>
                  )}
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
                    Ver Resultados Parciais
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }} align="center">
                    Acompanhe a apuração em tempo real
                  </Typography>
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
                  <Typography variant="caption" display="block" sx={{ mt: 1 }} align="center">
                    {voterInfo?.hasVoted 
                      ? 'Consulte os detalhes do seu voto'
                      : 'Disponível após votar'}
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

export default VoterDashboard;