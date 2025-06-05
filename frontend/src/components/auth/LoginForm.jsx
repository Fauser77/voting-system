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
    privateKey: '0x4b303ac43aaaee7491caebd674f22356343b7fbfa936e3b313564fc4132ef744'
  },
  voter1: {
    address: '0xCD129025A28b10C61cDc210F58b8808A91038094',
    privateKey: '0xe4e79abf49209e47d9082c5544600c83fc0a9249394bdf9d691491f7723f9a4c'
  },
  voter2: {
    address: '0xE8e478126502D53c3CeCD94FEb7Ce68893AAd645',
    privateKey: '0x5e26ea4b4c4c07b8b66b9a137c396b5f316b1cf4d906fda1413466f2ad196985'
  },
  voter3: {
    address: '0xfcb3A6a90A57148d038455EDE0f4d1c343548B43',
    privateKey: '0x9af8053caa96a0b4391e03530d6e7896fbca032869be4caf304f3164604ee9bb'
  },
  voter4: {
    address: '0x008236356cc7c1a9F435f3F828434932437990d1',
    privateKey: '0x062860eca5db48e22d3dbccc85f698f5c052d17379176e16300a3a937fa27813'
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
        Nota: Em produção, usar uma solução de wallet segura como MetaMask
      </Typography>
    </Box>
  );
};

export default LoginForm;