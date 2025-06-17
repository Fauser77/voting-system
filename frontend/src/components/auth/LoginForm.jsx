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

// Chaves privadas para desenvolvimento (APENAS PARA TESTES)
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
  },
  voter5: {
    address: '0x703177243768e3bfd707C4dfe915717F10aaD69d',
    privateKey: '0x6bb9fd888bc8c620da49fbbfea6a5ca97d6efea7aa1dfab595ddfdfa5a2c5f1c'
  },
  voter6: {
    address: '0x8dada891413d4a04d47351221955d7077C0Da34D',
    privateKey: '0xf21d37aed7f7093fc269fcc977b0805eba2a22eb84c0a5bb29dfbf404c8dc1cf'
  },
  voter7: {
    address: '0x5d54e97A38991398E5B9aC524554101F6BEFBB0B',
    privateKey: '0xa83850320f84027ded855da172f7a184f499b38156173c51469d99011f2bcfbc'
  },
  voter8: {
    address: '0x48616dFA5847b26AfF853d13e1904DD59844D521',
    privateKey: '0xbd2279f1231aef89a95114365389d7865d23df82b7627d55aae8f932925d3272'
  },
  voter9: {
    address: '0xe2f31711514CD397DFbf3Abb61fcA17f23F81Ab4',
    privateKey: '0xb1f35adfbbc6db40cf95cfbc90ba98ac4cd0d7e2c2196ec5d797a92a1a4932fb'
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
              <MenuItem value="voter5">Eleitor 5</MenuItem>
              <MenuItem value="voter6">Eleitor 6</MenuItem>
              <MenuItem value="voter7">Eleitor 7</MenuItem>
              <MenuItem value="voter8">Eleitor 8</MenuItem>
              <MenuItem value="voter9">Eleitor 9</MenuItem>
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
    </Box>
  );
};

export default LoginForm;