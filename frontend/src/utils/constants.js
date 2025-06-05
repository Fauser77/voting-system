// Configurações da Rede
export const NETWORK_CONFIG = {
    chainId: process.env.REACT_APP_NETWORK_ID || '12345',
    rpcUrl: process.env.REACT_APP_RPC_URL || 'http://localhost:8545',
    networkName: 'PoA Voting Network'
  };
  
  // Endereço do Contrato
  export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x7b695a12d79C23d73f2e7a563F51A519369B8b1d';
  
  // Tipos de Usuário
  export const USER_TYPES = {
    CHAIRPERSON: 'chairperson',
    VOTER: 'voter',
    GUEST: 'guest'
  };
  
  // Estados da Votação
  export const VOTING_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    ENDED: 'ended'
  };
  
  // Mensagens
  export const MESSAGES = {
    WALLET_CONNECT_ERROR: 'Erro ao conectar com a carteira',
    VOTE_SUCCESS: 'Voto registrado com sucesso!',
    VOTE_ERROR: 'Erro ao registrar voto',
    PERMISSION_GRANTED: 'Permissão de voto concedida com sucesso!',
    ALREADY_VOTED: 'Você já votou nesta eleição',
    NO_PERMISSION: 'Você não tem permissão para votar',
    TRANSACTION_PENDING: 'Transação em processamento...',
    LOADING_CONTRACT: 'Carregando contrato...'
  };