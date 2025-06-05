import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const VoterDashboard = () => {
  const { user, voterInfo } = useAuth();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Painel do Eleitor
        </Typography>
        
        <Typography variant="body1" paragraph>
          Bem-vindo, {user?.address}
        </Typography>

        {/* TODO: Adicionar componentes de votação */}
        <Typography variant="body2" color="text.secondary">
          Status: {voterInfo?.hasVoted ? 'Já votou' : 'Ainda não votou'}
        </Typography>
      </Box>
    </Container>
  );
};

export default VoterDashboard;