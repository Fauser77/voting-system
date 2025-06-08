import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControlLabel,
  Grid,
  IconButton,
  Collapse,
  List,
  ListItem,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  HowToVote as VoteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import { useWeb3 } from '../contexts/Web3Context';

const BlockchainMonitor = () => {
  const navigate = useNavigate();
  const { contract, provider } = useWeb3();
  
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterEmpty, setFilterEmpty] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState({});
  const intervalRef = useRef(null);

  useEffect(() => {
    loadRecentBlocks();

    // Auto-refresh se habilitado
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadRecentBlocks(false); // Sem loading indicator no auto-refresh
      }, 15000); // A cada 15 segundos (tempo de bloco da rede PoA)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, filterEmpty]);

  const loadRecentBlocks = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError('');

      const currentBlockNumber = await provider.getBlockNumber();
      const blocksToLoad = 20; // Carregar últimos 20 blocos
      const blockPromises = [];

      for (let i = 0; i < blocksToLoad; i++) {
        const blockNumber = currentBlockNumber - i;
        if (blockNumber >= 0) {
          blockPromises.push(loadBlockWithVotes(blockNumber));
        }
      }

      const loadedBlocks = await Promise.all(blockPromises);
      
      // Filtrar blocos vazios se necessário
      const filteredBlocks = filterEmpty 
        ? loadedBlocks.filter(block => block.votes.length > 0)
        : loadedBlocks;

      setBlocks(filteredBlocks);

    } catch (err) {
      console.error('Erro ao carregar blocos:', err);
      setError('Erro ao carregar dados da blockchain');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadBlockWithVotes = async (blockNumber) => {
    try {
      const block = await provider.getBlock(blockNumber, true);
      const blockData = {
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        transactionCount: block.transactions.length,
        votes: []
      };

      // Buscar eventos de votação neste bloco
      const filter = contract.filters.VoteCast();
      const events = await contract.queryFilter(filter, blockNumber, blockNumber);

      for (const event of events) {
        const tx = await provider.getTransaction(event.transactionHash);
        blockData.votes.push({
          transactionHash: event.transactionHash,
          voter: tx.from,
          candidateName: event.args.candidateName,
          gasUsed: tx.gasLimit.toString()
        });
      }

      return blockData;

    } catch (err) {
      console.error(`Erro ao carregar bloco ${blockNumber}:`, err);
      return null;
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('pt-BR');
  };

  const truncateHash = (hash) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const toggleBlockExpansion = (blockNumber) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [blockNumber]: !prev[blockNumber]
    }));
  };

  const handleRefresh = () => {
    loadRecentBlocks();
  };

  if (isLoading && blocks.length === 0) {
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
        <Button
          variant="text"
          startIcon={<BackIcon />}
          onClick={() => navigate('/admin')}
          sx={{ mb: 2 }}
        >
          Voltar ao Painel Admin
        </Button>

        <Typography variant="h4" component="h1" gutterBottom align="center">
          Monitor da Blockchain
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Controles */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filterEmpty}
                    onChange={(e) => setFilterEmpty(e.target.checked)}
                  />
                }
                label="Mostrar apenas blocos com votos"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Atualização automática"
              />
            </Grid>
            <Grid item xs={12} md={4} textAlign="right">
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={isLoading}
              >
                Atualizar Agora
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Lista de Blocos */}
        <Box sx={{ position: 'relative' }}>
          {autoRefresh && (
            <Chip
              icon={<PlayIcon />}
              label="Atualizando a cada 15s"
              color="success"
              size="small"
              sx={{ position: 'absolute', top: -20, right: 0 }}
            />
          )}

          <List>
            {blocks.map((block, index) => (
              block && (
                <Card key={block.number} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <BlockIcon sx={{ fontSize: 30, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="h6">
                            Bloco #{block.number}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(block.timestamp)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {block.votes.length > 0 && (
                          <Chip
                            icon={<VoteIcon />}
                            label={`${block.votes.length} voto${block.votes.length > 1 ? 's' : ''}`}
                            color="primary"
                            size="small"
                          />
                        )}
                        <IconButton
                          onClick={() => toggleBlockExpansion(block.number)}
                          size="small"
                        >
                          {expandedBlocks[block.number] ? <CollapseIcon /> : <ExpandIcon />}
                        </IconButton>
                      </Box>
                    </Box>

                    <Collapse in={expandedBlocks[block.number]}>
                      <Divider sx={{ my: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            Hash do Bloco
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {block.hash}
                          </Typography>
                        </Grid>

                        {block.votes.length > 0 ? (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Transações de Voto
                            </Typography>
                            {block.votes.map((vote, voteIndex) => (
                              <Card key={voteIndex} variant="outlined" sx={{ p: 2, mb: 1 }}>
                                <Grid container spacing={1}>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary">
                                      Eleitor
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                      {truncateHash(vote.voter)}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary">
                                      Candidato
                                    </Typography>
                                    <Typography variant="body2">
                                      {vote.candidateName}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">
                                      Hash da Transação
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                      {vote.transactionHash}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Card>
                            ))}
                          </Grid>
                        ) : (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              Bloco sem transações de voto
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Collapse>
                  </CardContent>
                </Card>
              )
            ))}
          </List>

          {blocks.length === 0 && !isLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                {filterEmpty 
                  ? 'Nenhum bloco com votos encontrado nos últimos 20 blocos.'
                  : 'Nenhum bloco encontrado.'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default BlockchainMonitor;