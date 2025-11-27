const path = require('path');
const { ethers } = require('ethers');
const fs = require('fs').promises;

// Caminho para a pasta blockchain
const BLOCKCHAIN_PATH = path.resolve(__dirname, process.env.BLOCKCHAIN_PATH || '../../../blockchain');

/**
 * Serviço que usa os scripts blockchain/ existentes
 * Modificado para não depender do Hardhat Runtime Environment
 */
class BlockchainService {
  constructor() {
    this.config = null;
    this.provider = null;
    this.adminWallet = null;
    this.contract = null;
  }

  /**
   * Carrega configuração pública (sem usar Hardhat)
   */
  async loadPublicConfig() {
    try {
      const publicConfigPath = path.join(BLOCKCHAIN_PATH, 'config/public-config.json');
      const data = await fs.readFile(publicConfigPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Erro ao carregar public-config.json: ${error.message}`);
    }
  }

  /**
   * Inicializa conexão com blockchain
   */
  async initialize() {
    try {
      console.log('📡 Conectando ao blockchain...');
      
      // Carregar configuração pública
      const publicConfig = await this.loadPublicConfig();
      
      // Setup provider
      this.provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL || publicConfig.rpcUrl);
      
      // Setup wallet admin
      this.adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, this.provider);
      
      // ABI expandido com todas as funções necessárias
      const CONTRACT_ABI = [
        "function checkCPFStatus(bytes32 cpfHash) view returns (bool isUsed)",
        "function registerVoterWithCPF(address voterAddress, bytes32 cpfHash)",
        "function submitEncryptedVote(uint256[] c1_values, uint256[] c2_values, bytes signature, address voter)",
        "function phase() view returns (uint8)",
        "function totalAuthorizedVoters() view returns (uint256)",
        "function hasRightToVote(address voter) view returns (bool)",
        "function hasVoted(address voter) view returns (bool)",
        "function voterToCPF(address voter) view returns (bytes32)",
        "function getProposalCount() view returns (uint256)",
        "event VoterRegistered(address indexed voter, bytes32 indexed cpfHash)",
        "event VoteSubmitted(uint256[] c1_values, uint256[] c2_values, uint256 timestamp, address indexed relayer)"
      ];
      
      // Conectar ao contrato
      this.contract = new ethers.Contract(
        publicConfig.contract,
        CONTRACT_ABI,
        this.adminWallet
      );
      
      // Armazenar config
      this.config = {
        contract: this.contract,
        candidateNames: publicConfig.candidateNames,
        numCandidates: publicConfig.numCandidates,
        params: {
          p: BigInt(publicConfig.elgamalParams.p),
          g: BigInt(publicConfig.elgamalParams.g),
          h: BigInt(publicConfig.elgamalParams.h)
        },
        network: publicConfig.network,
        deployedAt: publicConfig.votingStarted
      };
      
      console.log('✅ Conectado ao contrato:', this.contract.target);
      console.log('✅ Admin wallet:', this.adminWallet.address);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar:', error.message);
      throw error;
    }
  }

  /**
   * Hash CPF usando Keccak256 (igual ao authorize-voter.js)
   */
  hashCPF(cpf) {
    return ethers.keccak256(ethers.toUtf8Bytes(cpf));
  }

  /**
   * Carrega CPFs autorizados do arquivo
   */
  async loadAuthorizedCPFs() {
    try {
      const cpfFilePath = path.join(BLOCKCHAIN_PATH, 'config/election-cpfs.json');
      const data = await fs.readFile(cpfFilePath, 'utf8');
      return JSON.parse(data).cpfs;
    } catch (error) {
      throw new Error('Erro ao carregar CPFs autorizados');
    }
  }

  /**
   * Valida CPF off-chain (lista autorizada)
   */
  async checkCPFOffChain(cpf) {
    const authorizedCPFs = await this.loadAuthorizedCPFs();
    return authorizedCPFs.includes(cpf);
  }

  /**
   * Verifica status do CPF on-chain (já foi usado?)
   */
  async checkCPFOnChain(cpfHash) {
    try {
      const isUsed = await this.contract.checkCPFStatus(cpfHash);
      return !isUsed; // true se disponível
    } catch (error) {
      throw new Error('Erro ao verificar CPF no blockchain');
    }
  }

  /**
   * Registra eleitor no blockchain
   */
  async registerVoter(voterAddress, cpfHash) {
    try {
      console.log('📝 Registrando eleitor...');
      const tx = await this.contract.registerVoterWithCPF(voterAddress, cpfHash);
      
      console.log('⏳ Aguardando confirmação...');
      const receipt = await tx.wait();
      
      console.log('✅ Eleitor registrado');
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      throw new Error(`Erro ao registrar: ${error.message}`);
    }
  }

  /**
   * Atualiza election-config.json (igual ao authorize-voter.js)
   */
  async updateElectionConfig(voterAddress) {
    try {
      const configPath = path.join(BLOCKCHAIN_PATH, 'config/election-config.json');
      const data = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(data);
      
      if (!config.authorizedVoters.includes(voterAddress)) {
        config.authorizedVoters.push(voterAddress);
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        console.log('📄 election-config.json atualizado');
      }
    } catch (error) {
      console.warn('⚠️  Não foi possível atualizar election-config.json');
    }
  }

  /**
   * Obtém fase atual da eleição
   */
  async getCurrentPhase() {
    try {
      const phase = await this.contract.phase();
      const phases = ['Registration', 'Voting', 'Ended'];
      return {
        phaseNumber: Number(phase),
        phaseName: phases[Number(phase)]
      };
    } catch (error) {
      throw new Error('Erro ao obter fase da eleição');
    }
  }

  /**
   * Obtém estatísticas
   */
  async getStats() {
    try {
      const cpfFilePath = path.join(BLOCKCHAIN_PATH, 'config/election-cpfs.json');
      const cpfData = await fs.readFile(cpfFilePath, 'utf8');
      const totalAuthorizedCPFs = JSON.parse(cpfData).cpfs.length;
      
      const totalRegistered = await this.contract.totalAuthorizedVoters();
      const phase = await this.getCurrentPhase();
      
      return {
        totalAuthorizedCPFs,
        totalRegisteredVoters: Number(totalRegistered),
        pendingRegistrations: totalAuthorizedCPFs - Number(totalRegistered),
        currentPhase: phase.phaseName
      };
    } catch (error) {
      throw new Error('Erro ao obter estatísticas');
    }
  }

  /**
   * Health check da conexão
   */
  async healthCheck() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        connected: true,
        network: network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        contractAddress: this.contract.target
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // ==================== MÉTODOS DE VOTAÇÃO ====================

  /**
   * Verifica se eleitor tem direito de voto
   */
  async hasRightToVote(voterAddress) {
    try {
      const hasRight = await this.contract.hasRightToVote(voterAddress);
      return hasRight;
    } catch (error) {
      console.error('Erro ao verificar direito de voto:', error);
      throw new Error(`Erro ao verificar direito de voto: ${error.message}`);
    }
  }

  /**
   * Verifica se eleitor já votou
   */
  async hasVoted(voterAddress) {
    try {
      const voted = await this.contract.hasVoted(voterAddress);
      return voted;
    } catch (error) {
      console.error('Erro ao verificar se votou:', error);
      throw new Error(`Erro ao verificar se eleitor votou: ${error.message}`);
    }
  }

  /**
   * Busca lista de candidatos
   */
  async getCandidates() {
    try {
      const numCandidates = this.config.numCandidates;
      const candidates = [];
      
      for (let i = 0; i < numCandidates; i++) {
        candidates.push({
          index: i,
          name: this.config.candidateNames[i]
        });
      }
      
      return candidates;
    } catch (error) {
      throw new Error('Erro ao buscar candidatos');
    }
  }

  /**
   * Retorna parâmetros ElGamal
   */
  async getElGamalParams() {
    return {
      p: this.config.params.p.toString(),
      g: this.config.params.g.toString(),
      h: this.config.params.h.toString()
    };
  }

  /**
   * Submete voto cifrado via relayer
   */
  async submitVote(voterAddress, c1_values, c2_values, signature) {
    try {
      console.log('📤 Relayer submetendo voto...');
      
      // Usar a chave do relayer (segunda conta)
      const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
      if (!relayerPrivateKey) {
        throw new Error('RELAYER_PRIVATE_KEY não configurada no .env');
      }
      
      const relayerWallet = new ethers.Wallet(relayerPrivateKey, this.provider);
      const contractWithRelayer = this.contract.connect(relayerWallet);
      
      console.log('🔄 Relayer:', relayerWallet.address);
      
      const tx = await contractWithRelayer.submitEncryptedVote(
        c1_values,
        c2_values,
        signature,
        voterAddress
      );
      
      console.log('⏳ Aguardando confirmação...');
      const receipt = await tx.wait();
      
      console.log('✅ Voto registrado');
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Erro detalhado ao submeter voto:', error);
      throw new Error(`Erro ao submeter voto: ${error.message}`);
    }
  }
}

// Exportar instância única (Singleton)
const blockchainService = new BlockchainService();

module.exports = blockchainService;