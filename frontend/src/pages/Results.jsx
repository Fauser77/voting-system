import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

const Results = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Resultados da Eleição
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="body1" align="center" color="text.secondary">
            Os resultados serão exibidos aqui após o término da votação.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Results;