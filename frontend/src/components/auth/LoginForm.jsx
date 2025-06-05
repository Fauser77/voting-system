import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { useWeb3 } from '../../contexts/Web3Context';

// Chaves privadas para desenvolvimento (APENAS PARA TESTES!)
const TEST_ACCOUNTS = {
  chairperson: {
    address: '0x694879a40d1aB5D721f629F95a31b89c157CF712',
    privateKey: '0x4c0883a6910395c8f0e5f3e7b1c5f8e8d3e0c3d5f1e7d9c5b1a3958d7c6a5c4a3b2a'
  },
  voter1: {
    address: '0xCD129025A28b10C61cDc210F58b8808A91038094',
    privateKey: '0x5d0994b7020395d9f1e6f4e8b2c6f9e9d4e1c4d6f2e8d0c6b2a4069e8d7d6b5d4b3c2b'
  },
  voter2: {
    address: '0xE8e478126502D53c3CeCD94FEb7Ce68893AAd645',
    privateKey: '0x6e1005c8130496e0f2f7f5f9c3d7f0fae5f2d5e7f3f9e1d7c3b5170f9e8e7c6e5c3d2c'
  },
  voter3: {
    address: '0xfcb3A6a90A57148d038455EDE0f4d1c343548B43',
    privateKey: '0x7f2116d9241507f1f3f8f6f0d4e8f1fbf6f3e6f8f4f0f2e8d4c6281f0f9f8d7f6d4e2d'
  },
  voter4: {
    address: '0x008236356cc7c1a9F435f3F828434932437990d1',
    privateKey: '0x8032273a352618f2f4f9f7f1e5f9f2fcf7f4f7f9f5f1f3f9e5d73920100f9e8f7e5f3e'
  }
};

const LoginForm = ({ onError }) => {
  const { connectAccount } = useWeb3();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [useTestAccount, setUseTestAccount] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestAccountSelect = (accountKey) => {
    setSelectedAccount(accountKey);
    if (accountKey && TEST_ACCOUNTS[accountKey]) {
      setPrivateKey(TEST_ACCOUNTS[accountKey].privateKey);
    } else {
      setPrivateKey('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    onError('');

    try {
      const keyToUse = useTestAccount 
        ? TEST_ACCOUNTS[selectedAccount]?.privateKey 
        : privateKey;

      if (!keyToUse) {
        throw new Error('Por favor, selecione uma conta ou insira uma chave privada');
      }

      await connectAccount(keyToUse);
      
    } catch (error) {
      console.error('Erro no login:', error);
      onError(error.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
      {useTestAccount ? (
        <>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Selecione uma conta de teste</InputLabel>
            <Select
              value={selectedAccount}
              onChange={(e) => handleTestAccountSelect(e.target.value)}
              label="Selecione uma conta de teste"
            >
              <MenuItem value="">
                <em>Selecione...</em>
              </MenuItem>
              <MenuItem value="chairperson">
                Administrador (Chairperson)
              </MenuItem>
              <MenuItem value="voter1">Eleitor 1</MenuItem>
              <MenuItem value="voter2">Eleitor 2</MenuItem>
              <MenuItem value="voter3">Eleitor 3</MenuItem>
              <MenuItem value="voter4">Eleitor 4</MenuItem>
            </Select>
          </FormControl>

          {selectedAccount && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Endereço:</strong> {TEST_ACCOUNTS[selectedAccount].address}
              </Typography>
            </Alert>
          )}
        </>
      ) : (
        <TextField
          fullWidth
          label="Chave Privada"
          type="password"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="0x..."
          sx={{ mb: 3 }}
          helperText="Insira sua chave privada para acessar o sistema"
        />
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="text"
          size="small"
          onClick={() => setUseTestAccount(!useTestAccount)}
        >
          {useTestAccount 
            ? 'Usar chave privada personalizada' 
            : 'Usar conta de teste'}
        </Button>
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isLoading || (!privateKey && !selectedAccount)}
        startIcon={isLoading ? <CircularProgress size={20} /> : <LoginIcon />}
      >
        {isLoading ? 'Conectando...' : 'Entrar'}
      </Button>

      <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
        Nota: Em produção, use uma solução de wallet segura como MetaMask
      </Typography>
    </Box>
  );
};

export default LoginForm;