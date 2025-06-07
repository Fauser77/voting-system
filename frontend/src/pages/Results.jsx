import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  EmojiEvents as TrophyIcon,
  Person as PersonIcon,
  HowToVote as VoteIcon,
} from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useWeb3 } from '../contexts/Web3Context';
import { votingService } from '../services/votingService';

const Results = () => {
  const { contract } = useWeb3();
  const [results, setResults] = useState([]);
  const [winner, setWinner] = useState(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadResults();
  }, [contract]);

  const loadResults = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await votingService.getResults(contract);
      
      setResults(data.candidates);
      setWinner(data.winner);
      setTotalVotes(data.totalVotes);
      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('Erro ao carregar resultados:', err);
      setError('Erro ao carregar resultados da eleição');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadResults();
  };

  const getChartData = () => {
    return {
      xAxis: [{ 
        scaleType: 'band', 
        data: results.map(r => r.name) 
      }],
      series: [{ 
        data: results.map(r => r.voteCount),
        color: '#1976d2',
      }],
    };
  };

  const getProgressValue = (voteCount) => {
    if (totalVotes === 0) return 0;
    return (voteCount / totalVotes) * 100;
  };

  if (isLoading && !isRefreshing) {
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
          Resultados da Eleição
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Informações Gerais */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <VoteIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Total de Votos
                </Typography>
                <Typography variant="h3" color="primary">
                  {totalVotes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrophyIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Liderando
                </Typography>
                <Typography variant="h5" color="text.primary">
                  {winner?.name || 'Empate'}
                </Typography>
                {winner && (
                  <Chip 
                    label={`${winner.voteCount} votos`} 
                    color="warning" 
                    sx={{ mt: 1 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Última Atualização
                </Typography>
                <Typography variant="body1">
                  {lastUpdate.toLocaleTimeString('pt-BR')}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  sx={{ mt: 2 }}
                >
                  {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Gráfico de Barras */}
        {results.length > 0 && (
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Gráfico de Votos
            </Typography>
            <Box sx={{ width: '100%', height: 400 }}>
              <BarChart
                {...getChartData()}
                height={350}
                margin={{ left: 50, right: 50, top: 50, bottom: 50 }}
              />
            </Box>
          </Paper>
        )}

        {/* Lista Detalhada de Candidatos */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Votos por Candidato
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            {results.map((candidate, index) => {
              const isLeading = winner && candidate.name === winner.name;
              const percentage = getProgressValue(candidate.voteCount);

              return (
                <Grid item xs={12} key={index}>
                  <Card 
                    variant="outlined"
                    sx={{
                      border: isLeading ? '2px solid #ffa726' : undefined,
                      bgcolor: isLeading ? 'rgba(255, 167, 38, 0.08)' : undefined,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PersonIcon sx={{ mr: 2, fontSize: 30, color: 'text.secondary' }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="div">
                            {candidate.name}
                            {isLeading && (
                              <Chip 
                                label="Liderando" 
                                size="small" 
                                color="warning" 
                                sx={{ ml: 2 }}
                              />
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Candidato {index + 1}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h4" color="primary">
                            {candidate.voteCount}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            votos ({percentage.toFixed(1)}%)
                          </Typography>
                        </Box>
                      </Box>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={percentage} 
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: isLeading ? 'warning.main' : 'primary.main',
                          }
                        }} 
                      />
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {results.length === 0 && !error && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum voto registrado até o momento.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Results;