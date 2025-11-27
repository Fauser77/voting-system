import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const votingService = {
  /**
   * Autentica eleitor via endereço público
   */
  authenticateVoter: async (voterAddress) => {
    try {
      const response = await api.post('/api/voting/authenticate', { voterAddress });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  /**
   * Submete voto cifrado
   */
  submitVote: async (voterAddress, c1_values, c2_values, signature) => {
    try {
      const response = await api.post('/api/voting/submit', {
        voterAddress,
        c1_values,
        c2_values,
        signature
      });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  /**
   * Verifica status de endereço
   */
  verifyAddress: async (address) => {
    try {
      const response = await api.get(`/api/voting/verify/${address}`);
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  }
};

function handleAPIError(error) {
  if (error.response) {
    const message = error.response.data.error || 'Erro desconhecido';
    return new Error(message);
  } else if (error.request) {
    return new Error('Servidor não respondeu. Verifique se a API está rodando.');
  } else {
    return new Error(error.message || 'Erro ao fazer requisição');
  }
}

export default votingService;