import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const Loading = ({ fullScreen = false, message = 'Carregando...' }) => {
  const containerStyles = fullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
      };

  return (
    <Box sx={containerStyles}>
      <CircularProgress size={60} thickness={4} />
      <Typography variant="body1" sx={{ mt: 2 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default Loading;