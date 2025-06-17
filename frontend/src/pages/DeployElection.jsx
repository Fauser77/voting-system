// frontend/src/pages/DeployElection.jsx
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
  IconButton,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Ballot as BallotIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useWeb3 } from '../contexts/Web3Context';
import { deployService } from '../services/deployService';
import { CONTRACT_ADDRESS } from '../utils/constants';


const DeployElection = () => {
  const navigate = useNavigate();
  const { signer, provider } = useWeb3();
  
  const [candidates, setCandidates] = useState(['', '', '']); // Iniciar com 3 campos
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deployedContract, setDeployedContract] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);


  const handleCandidateChange = (index, value) => {
    const newCandidates = [...candidates];
    newCandidates[index] = value;
    setCandidates(newCandidates);
  };

  const addCandidate = () => {
    if (candidates.length < 10) { // Limite máximo de candidatos
      setCandidates([...candidates, '']);
    }
  };

  const removeCandidate = (index) => {
    if (candidates.length > 2) { // Mínimo de 2 candidatos
      const newCandidates = candidates.filter((_, i) => i !== index);
      setCandidates(newCandidates);
    }
  };

  const validateCandidates = () => {
    const validCandidates = candidates.filter(c => c.trim() !== '');
    
    if (validCandidates.length < 2) {
      setError('É necessário pelo menos 2 candidatos');
      return false;
    }
    
    // Verificar duplicados
    const uniqueCandidates = new Set(validCandidates.map(c => c.trim().toLowerCase()));
    if (uniqueCandidates.size !== validCandidates.length) {
      setError('Não pode haver candidatos com nomes duplicados');
      return false;
    }
    
    return true;
  };

  const handleDeploy = () => {
    if (validateCandidates()) {
      setConfirmDialog(true);
    }
  };

  const confirmDeploy = async () => {
    setConfirmDialog(false);
    setIsDeploying(true);
    setError('');
    setSuccess('');

    try {
      const validCandidates = candidates.filter(c => c.trim() !== '');
      
      // Verificar se já existe um contrato ativo
      if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x0') {
        const existingContract = deployService.getDeployedContract();
        if (existingContract) {
          setError('Já existe uma eleição ativa. Para criar uma nova eleição, você precisa encerrar a atual primeiro.');
          return;
        }
      }
      
      // Deploy do novo contrato
      const result = await deployService.deployNewBallot(signer, validCandidates);
      
      if (result.success) {
        setDeployedContract(result);
        setSuccess(`Eleição criada com sucesso! Endereço do contrato: ${result.contractAddress}`);
        
        // Aguardar um pouco e redirecionar
        setTimeout(() => {
          // Aqui você precisaria atualizar o CONTRACT_ADDRESS no sistema
          // Por enquanto, vamos apenas salvar no localStorage
          localStorage.setItem('currentContractAddress', result.contractAddress);
          navigate('/admin');
        }, 3000);
      }
      
    } catch (err) {
      console.error('Erro ao criar eleição:', err);
      setError(err.message || 'Erro ao criar nova eleição');
    } finally {
      setIsDeploying(false);
    }
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
          Criar Nova Eleição
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => {
              deployService.clearDeployedContract();
              setSnackbarOpen(true);
            }}
          >
            Ignorar eleição anterior
          </Button>
        </Box>

        {/* Feedback visual */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={() => setSnackbarOpen(false)}
        >
          <Alert severity="info" onClose={() => setSnackbarOpen(false)}>
            Dados da eleição anterior removidos. Você pode criar uma nova.
          </Alert>
        </Snackbar>

        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configurar Candidatos
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <List>
            {candidates.map((candidate, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <TextField
                  fullWidth
                  label={`Candidato ${index + 1}`}
                  value={candidate}
                  onChange={(e) => handleCandidateChange(index, e.target.value)}
                  disabled={isDeploying}
                  InputProps={{
                    endAdornment: candidates.length > 2 && (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => removeCandidate(index)}
                          disabled={isDeploying}
                          edge="end"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ my: 1 }}
                />
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addCandidate}
              disabled={isDeploying || candidates.length >= 10}
            >
              Adicionar Candidato
            </Button>
            
            <Chip 
              label={`${candidates.filter(c => c.trim() !== '').length} candidatos`}
              color="primary"
              variant="outlined"
            />
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Importante:</strong> Uma vez criada, a eleição não pode ser modificada. 
              Certifique-se de que todos os candidatos estão corretos antes de prosseguir.
            </Typography>
          </Alert>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin')}
              disabled={isDeploying}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="large"
              color="primary"
              startIcon={isDeploying ? <CircularProgress size={20} /> : <BallotIcon />}
              onClick={handleDeploy}
              disabled={isDeploying || candidates.filter(c => c.trim() !== '').length < 2}
            >
              {isDeploying ? 'Criando Eleição...' : 'Criar Eleição'}
            </Button>
          </Box>
        </Paper>

        {/* Dialog de Confirmação */}
        <Dialog
          open={confirmDialog}
          onClose={() => setConfirmDialog(false)}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              Confirmar Criação da Eleição
            </Box>
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Você está prestes a criar uma nova eleição com os seguintes candidatos:
              <Box sx={{ my: 2 }}>
                {candidates.filter(c => c.trim() !== '').map((candidate, index) => (
                  <Chip
                    key={index}
                    label={candidate}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Box>
              Esta ação não pode ser desfeita. Deseja continuar?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmDeploy} variant="contained" color="primary">
              Confirmar e Criar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DeployElection;