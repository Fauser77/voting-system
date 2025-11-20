import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Instancia configurada do axios
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Servico de autorizacao de eleitores
 */
export const authorizationService = {
  /**
   * Valida CPF e retorna hash se aprovado
   */
  validateCPF: async (cpf) => {
    try {
      const response = await api.post('/api/authorization/validate-cpf', { cpf });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  /**
   * Registra eleitor no blockchain
   */
  registerVoter: async (voterAddress, cpfHash) => {
    try {
      const response = await api.post('/api/authorization/register', {
        voterAddress,
        cpfHash,
      });
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  /**
   * Obtem estatisticas do sistema
   */
  getStats: async () => {
    try {
      const response = await api.get('/api/authorization/stats');
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },

  /**
   * Verifica saude da API
   */
  healthCheck: async () => {
    try {
      const response = await api.get('/api/authorization/health');
      return response.data;
    } catch (error) {
      throw handleAPIError(error);
    }
  },
};

/**
 * Tratamento de erros da API
 */
function handleAPIError(error) {
  if (error.response) {
    // Erro retornado pela API
    const message = error.response.data.error || 
                    error.response.data.errors?.join(', ') || 
                    'Erro desconhecido';
    return new Error(message);
  } else if (error.request) {
    // Sem resposta do servidor
    return new Error('Servidor nao respondeu. Verifique se a API esta rodando.');
  } else {
    // Erro na configuracao da requisicao
    return new Error(error.message || 'Erro ao fazer requisicao');
  }
}

export default api;