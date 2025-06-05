import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Painel Administrativo
        </Typography>
        
        <Typography variant="body1" paragraph>
          Bem-vindo, Administrador
        </Typography>

        {/* TODO: Adicionar componentes administrativos */}
        <Typography variant="body2" color="text.secondary">
          Endereço: {user?.address}
        </Typography>
      </Box>
    </Container>
  );
};

export default AdminDashboard;