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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  const [blocksToLoad, setBlocksToLoad] = useState(100); // Padrão de 100 blocos
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
  }, [autoRefresh, filterEmpty, blocksToLoad]);

  const loadRecentBlocks = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError('');

      const currentBlockNumber = await provider.getBlockNumber();
      const blockPromises = [];

      // Mostrar progresso para carregamentos grandes
      if (showLoading && blocksToLoad >= 100) {
        console.log(`Carregando últimos ${blocksToLoad} blocos...`);
      }

      for (let i = 0; i < blocksToLoad; i++) {
        const blockNumber = currentBlockNumber - i;
        if (blockNumber >= 0) {
          blockPromises.push(loadBlockWithVotes(blockNumber));
        }
      }

      // Processar em lotes para melhor performance
      const batchSize = 20;
      const loadedBlocks = [];
      
      for (let i = 0; i < blockPromises.length; i += batchSize) {
        const batch = blockPromises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        loadedBlocks.push(...batchResults);
        
        // Atualizar progresso para carregamentos grandes
        if (showLoading && blocksToLoad >= 100) {
          const progress = Math.floor((i + batchSize) / blockPromises.length * 100);
          console.log(`Progresso: ${progress}%`);
        }
      }
      
      // Filtrar blocos vazios se necessário
      const filteredBlocks = filterEmpty 
        ? loadedBlocks.filter(block => block && block.votes.length > 0)
        : loadedBlocks.filter(block => block !== null);

      setBlocks(filteredBlocks);

      // Informar estatísticas
      if (filterEmpty && showLoading) {
        const blocksWithVotes = filteredBlocks.length;
        console.log(`Encontrados ${blocksWithVotes} blocos com votos dos últimos ${blocksToLoad} blocos.`);
      }

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

  const handleBlocksToLoadChange = (event) => {
    setBlocksToLoad(event.target.value);
  };

  if (isLoading && blocks.length === 0) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            {blocksToLoad >= 100 
              ? `Carregando últimos ${blocksToLoad} blocos... Isso pode levar alguns momentos.`
              : 'Carregando blocos...'}
          </Typography>
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Blocos para carregar</InputLabel>
                <Select
                  value={blocksToLoad}
                  onChange={handleBlocksToLoadChange}
                  label="Blocos para carregar"
                >
                  <MenuItem value={20}>Últimos 20 blocos</MenuItem>
                  <MenuItem value={50}>Últimos 50 blocos</MenuItem>
                  <MenuItem value={100}>Últimos 100 blocos</MenuItem>
                  <MenuItem value={500}>Últimos 500 blocos</MenuItem>
                  <MenuItem value={1000}>Últimos 1000 blocos</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filterEmpty}
                    onChange={(e) => setFilterEmpty(e.target.checked)}
                  />
                }
                label="Apenas blocos com votos"
              />
            </Grid>
            <Grid item xs={12} md={3}>
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
            <Grid item xs={12} md={3} textAlign="right">
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
          
          {/* Estatísticas */}
          {filterEmpty && blocks.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Mostrando {blocks.length} blocos com votos dos últimos {blocksToLoad} blocos analisados
              </Typography>
            </Box>
          )}
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
                  ? `Nenhum bloco com votos encontrado nos últimos ${blocksToLoad} blocos.`
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