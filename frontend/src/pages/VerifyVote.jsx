import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  VerifiedUser as VerifiedIcon,
  Tag as HashIcon,
  AccessTime as TimeIcon,
  HowToVote as VoteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { votingService } from '../services/votingService';

const VerifyVote = () => {
  const navigate = useNavigate();
  const { user, voterInfo, isChairperson } = useAuth();
  const { contract, provider } = useWeb3();
  
  const [voteData, setVoteData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!voterInfo?.hasVoted) {
      setError('Você ainda não votou nesta eleição');
      setTimeout(() => navigate(isChairperson ? '/admin' : '/voter'), 3000);
      return;
    }
    
    findUserVote();
  }, [voterInfo, user]);

  const findUserVote = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (!contract || !provider || !user) {
        throw new Error('Serviços não disponíveis');
      }

      // Buscar eventos de votação do usuário
      const filter = contract.filters.VoteCast();
      const events = await contract.queryFilter(filter);
      
      // Filtrar eventos do usuário atual
      const userVoteEvents = [];
      
      for (const event of events) {
        const tx = await provider.getTransaction(event.transactionHash);
        if (tx && tx.from.toLowerCase() === user.address.toLowerCase()) {
          const block = await provider.getBlock(event.blockNumber);
          const receipt = await provider.getTransactionReceipt(event.transactionHash);
          
          userVoteEvents.push({
            blockNumber: event.blockNumber,
            blockHash: block.hash,
            timestamp: block.timestamp,
            transactionHash: event.transactionHash,
            candidateName: event.args.candidateName,
            from: tx.from,
            gasUsed: receipt.gasUsed.toString(),
            confirmations: await provider.getBlockNumber() - event.blockNumber,
          });
        }
      }
      
      if (userVoteEvents.length > 0) {
        // Pegar o voto mais recente (caso haja múltiplos - não deveria)
        const latestVote = userVoteEvents[userVoteEvents.length - 1];
        setVoteData(latestVote);
      } else {
        throw new Error('Não foi possível encontrar seu voto na blockchain');
      }
      
    } catch (err) {
      console.error('Erro ao buscar voto:', err);
      setError('Erro ao verificar seu voto na blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateHash = (hash) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Buscando seu voto na blockchain...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error && !voteData) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate(isChairperson ? '/admin' : '/voter')}
          >
            Voltar ao Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Button
          variant="text"
          startIcon={<BackIcon />}
          onClick={() => navigate(isChairperson ? '/admin' : '/voter')}
          sx={{ mb: 2 }}
        >
          Voltar ao Dashboard
        </Button>

        <Typography variant="h4" component="h1" gutterBottom align="center">
          Verificação do Seu Voto
        </Typography>

        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {voteData && (
          <>
            {/* Card de Confirmação */}
            <Card sx={{ mb: 3, bgcolor: 'success.main', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <VerifiedIcon sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Voto Verificado com Sucesso!
                </Typography>
                <Typography variant="body1">
                  Seu voto está registrado permanentemente na blockchain
                </Typography>
              </CardContent>
            </Card>

            {/* Detalhes do Voto */}
            <Paper elevation={3} sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom>
                Detalhes do Voto
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                {/* Candidato */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ bgcolor: 'rgba(25, 118, 210, 0.08)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Você votou em:
                          </Typography>
                          <Typography variant="h5" color="primary.main">
                            {voteData.candidateName}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Data e Hora */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Data e Hora
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(voteData.timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Bloco */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HashIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Bloco
                      </Typography>
                      <Typography variant="body1">
                        #{voteData.blockNumber}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Informações Técnicas */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Informações Técnicas
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Hash da Transação
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                        >
                          {voteData.transactionHash}
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Hash do Bloco
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                        >
                          {voteData.blockHash}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Endereço do Eleitor
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {truncateHash(voteData.from)}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Confirmações
                        </Typography>
                        <Chip 
                          label={`${voteData.confirmations} confirmações`}
                          color="success"
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {/* Nota de Segurança */}
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Nota de Segurança:</strong> Este registro é imutável e permanente. 
                      Seu voto foi contabilizado e não pode ser alterado ou removido.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}
      </Box>
    </Container>
  );
};

export default VerifyVote;