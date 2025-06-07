import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  HowToVote as VoteIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { votingService } from '../services/votingService';

const Vote = () => {
  const navigate = useNavigate();
  const { user, voterInfo, refreshVoterInfo } = useAuth();
  const { contract } = useWeb3();
  
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Selecionar Candidato', 'Confirmar Voto', 'Voto Registrado'];

  useEffect(() => {
    loadCandidates();
    checkVoterStatus();
  }, [contract]);

  const checkVoterStatus = async () => {
    try {
      await refreshVoterInfo();
      
      // Verificar se pode votar
      if (!voterInfo?.hasRightToVote) {
        setError('Você não tem permissão para votar');
        setTimeout(() => navigate('/voter'), 3000);
        return;
      }
      
      if (voterInfo?.hasVoted) {
        setError('Você já votou nesta eleição');
        setTimeout(() => navigate('/voter'), 3000);
        return;
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      setError('Erro ao verificar status do eleitor');
    }
  };

  const loadCandidates = async () => {
    try {
      setIsLoading(true);
      const candidatesList = await votingService.getCandidates(contract);
      setCandidates(candidatesList);
    } catch (err) {
      console.error('Erro ao carregar candidatos:', err);
      setError('Erro ao carregar lista de candidatos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate) {
      setError('Por favor, selecione um candidato');
      return;
    }
    setConfirmDialog(true);
  };

  const confirmVote = async () => {
    setConfirmDialog(false);
    setIsVoting(true);
    setError('');
    setActiveStep(1);

    try {
      const candidateIndex = parseInt(selectedCandidate);
      const result = await votingService.vote(contract, candidateIndex);
      
      if (result.success) {
        setSuccess(true);
        setActiveStep(2);
        await refreshVoterInfo();
        
        // Redirecionar após 5 segundos
        setTimeout(() => {
          navigate('/results');
        }, 5000);
      } else {
        throw new Error(result.error || 'Erro ao registrar voto');
      }
    } catch (err) {
      console.error('Erro ao votar:', err);
      setError(err.message || 'Erro ao registrar voto na blockchain');
      setActiveStep(0);
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (success) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              Voto Registrado com Sucesso!
            </Typography>
            <Typography variant="body1" paragraph>
              Seu voto foi registrado na blockchain e não pode ser alterado.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Você será redirecionado para a página de resultados em alguns segundos...
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/results')}
              sx={{ mt: 3 }}
            >
              Ver Resultados
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Votação
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Selecione seu candidato:
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <FormControl component="fieldset" sx={{ width: '100%' }}>
            <RadioGroup
              value={selectedCandidate}
              onChange={(e) => setSelectedCandidate(e.target.value)}
            >
              <Grid container spacing={2}>
                {candidates.map((candidate, index) => (
                  <Grid item xs={12} key={index}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        border: selectedCandidate === index.toString() 
                          ? '2px solid #1976d2' 
                          : '1px solid rgba(0, 0, 0, 0.12)',
                        '&:hover': {
                          boxShadow: 3,
                          borderColor: 'primary.main',
                        },
                      }}
                      onClick={() => setSelectedCandidate(index.toString())}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <FormControlLabel
                            value={index.toString()}
                            control={<Radio />}
                            label=""
                            sx={{ mr: 2 }}
                          />
                          <PersonIcon sx={{ mr: 2, fontSize: 40, color: 'text.secondary' }} />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6">
                              {candidate.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Candidato {index + 1}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </RadioGroup>
          </FormControl>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/voter')}
              disabled={isVoting}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={isVoting ? <CircularProgress size={20} /> : <VoteIcon />}
              onClick={handleVote}
              disabled={!selectedCandidate || isVoting}
              sx={{
                background: selectedCandidate && !isVoting
                  ? 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                  : undefined,
                boxShadow: selectedCandidate && !isVoting
                  ? '0 3px 5px 2px rgba(33, 203, 243, .3)'
                  : undefined,
              }}
            >
              {isVoting ? 'Registrando Voto...' : 'Confirmar Voto'}
            </Button>
          </Box>
        </Paper>

        {/* Dialog de Confirmação */}
        <Dialog
          open={confirmDialog}
          onClose={() => setConfirmDialog(false)}
          aria-labelledby="confirm-dialog-title"
        >
          <DialogTitle id="confirm-dialog-title">
            Confirmar Voto
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Você está prestes a votar em:
              <Box sx={{ my: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="h6" component="span">
                  {candidates[selectedCandidate]?.name}
                </Typography>
              </Box>
              <Alert severity="warning" sx={{ mt: 2 }}>
                Atenção: Após confirmar, seu voto será registrado na blockchain e 
                não poderá ser alterado.
              </Alert>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)} color="primary">
              Cancelar
            </Button>
            <Button 
              onClick={confirmVote} 
              color="primary" 
              variant="contained"
              startIcon={<VoteIcon />}
            >
              Confirmar Voto
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Vote;