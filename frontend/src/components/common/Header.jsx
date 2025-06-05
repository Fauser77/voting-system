import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import {
  HowToVote as VoteIcon,
  Logout as LogoutIcon,
  Assessment as ResultsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { USER_TYPES } from '../../utils/constants';

const Header = () => {
  const navigate = useNavigate();
  const { user, userType, isAuthenticated } = useAuth();
  const { disconnect } = useWeb3();

  const handleLogout = () => {
    disconnect();
    navigate('/');
  };

  const handleResultsClick = () => {
    navigate('/results');
  };

  const getUserTypeLabel = () => {
    switch (userType) {
      case USER_TYPES.CHAIRPERSON:
        return 'Administrador';
      case USER_TYPES.VOTER:
        return 'Eleitor';
      default:
        return 'Visitante';
    }
  };

  const getUserTypeColor = () => {
    switch (userType) {
      case USER_TYPES.CHAIRPERSON:
        return 'error';
      case USER_TYPES.VOTER:
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <AppBar position="sticky">
      <Toolbar>
        <VoteIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Sistema de Votação Blockchain
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            color="inherit"
            startIcon={<ResultsIcon />}
            onClick={handleResultsClick}
          >
            Resultados
          </Button>

          {isAuthenticated && user && (
            <>
              <Chip
                label={getUserTypeLabel()}
                color={getUserTypeColor()}
                size="small"
                sx={{ color: 'white' }}
              />
              
              <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
                {user.address.slice(0, 6)}...{user.address.slice(-4)}
              </Typography>
              
              <IconButton
                color="inherit"
                onClick={handleLogout}
                title="Sair"
              >
                <LogoutIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;