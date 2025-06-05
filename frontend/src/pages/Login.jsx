import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { HowToVote as VoteIcon } from '@mui/icons-material';
import LoginForm from '../components/auth/LoginForm';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { error: web3Error } = useWeb3();
  const { isAuthenticated, isChairperson } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirecionar se já estiver autenticado
    if (isAuthenticated) {
      if (isChairperson) {
        navigate('/admin');
      } else {
        navigate('/voter');
      }
    }
  }, [isAuthenticated, isChairperson, navigate]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <VoteIcon sx={{ fontSize: 60, color: 'primary.main' }} />
          </Box>
          
          <Typography variant="h4" component="h1" gutterBottom>
            Sistema de Votação
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Faça login com sua conta para acessar o sistema
          </Typography>

          {(error || web3Error) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || web3Error}
            </Alert>
          )}

          <LoginForm onError={setError} />
        </Paper>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, textAlign: 'center' }}
        >
          Sistema seguro baseado em Blockchain
        </Typography>
      </Box>
    </Container>
  );
};

export default Login;