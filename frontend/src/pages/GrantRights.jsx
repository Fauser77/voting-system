import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

const GrantRights = () => {
  const navigate = useNavigate();
  const { contract } = useWeb3();
  
  const [voterAddress, setVoterAddress] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentGrants, setRecentGrants] = useState([]);

  const validateAddress = (address) => {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  };

  const handleGrantRights = async () => {
    setError('');
    setSuccess('');

    // Validações
    if (!voterAddress.trim()) {
      setError('Por favor, insira um endereço');
      return;
    }

    if (!validateAddress(voterAddress)) {
      setError('Endereço inválido.');
      return;
    }

    try {
      setIsGranting(true);

      // Verificar se já tem direito de voto
      const hasRight = await contract.hasRightToVote(voterAddress);
      if (hasRight) {
        setError('Este endereço já possui direito de voto');
        return;
      }

      // Conceder direito de voto
      const tx = await contract.giveRightToVote(voterAddress);
      console.log('Transação enviada:', tx.hash);

      // Aguardar confirmação
      const receipt = await tx.wait();
      console.log('Transação confirmada:', receipt);

      // Adicionar à lista de concessões recentes
      setRecentGrants(prev => [{
        address: voterAddress,
        timestamp: new Date(),
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      }, ...prev].slice(0, 5)); // Manter apenas as 5 últimas

      setSuccess(`Direito de voto concedido com sucesso para ${voterAddress}`);
      setVoterAddress(''); // Limpar campo

    } catch (err) {
      console.error('Erro ao conceder direitos:', err);
      
      if (err.message.includes('Eleitor ja votou')) {
        setError('Este eleitor já votou e não pode receber novos direitos');
      } else if (err.message.includes('Apenas o administrador')) {
        setError('Apenas o administrador pode conceder direitos de voto');
      } else {
        setError(err.message || 'Erro ao conceder direito de voto');
      }
    } finally {
      setIsGranting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isGranting) {
      handleGrantRights();
    }
  };

  const truncateAddress = (address) => {
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  return (
    <Container maxWidth="md">
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
          Conceder Direito de Voto
        </Typography>

        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Autorizar Novo Eleitor
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Box>
            <TextField
              fullWidth
              label="Endereço do Eleitor"
              placeholder="0x..."
              value={voterAddress}
              onChange={(e) => setVoterAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isGranting}
              helperText="Insira o endereço Ethereum do eleitor (começando com 0x)"
              sx={{ mb: 3 }}
              InputProps={{
                sx: { fontFamily: 'monospace' }
              }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              color="primary"
              startIcon={isGranting ? <CircularProgress size={20} /> : <PersonAddIcon />}
              onClick={handleGrantRights}
              disabled={isGranting || !voterAddress.trim()}
            >
              {isGranting ? 'Processando...' : 'Conceder Direito de Voto'}
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Importante:</strong> Apenas eleitores com direito de voto concedido 
              pelo administrador podem participar da votação.
            </Typography>
          </Alert>
        </Paper>

        {/* Lista de Concessões Recentes */}
        {recentGrants.length > 0 && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Concessões Recentes
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List>
              {recentGrants.map((grant, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                          {truncateAddress(grant.address)}
                        </Typography>
                        <Chip 
                          label={`Bloco #${grant.blockNumber}`} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={`Concedido em ${grant.timestamp.toLocaleTimeString('pt-BR')}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default GrantRights;