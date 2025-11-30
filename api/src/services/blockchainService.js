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
        "function getVote(uint256 _index) view returns (uint256[] c1_values, uint256[] c2_values, uint256 timestamp, address relayer)",
        "function getTotalVotes() view returns (uint256)",
        "function getVoterStats() view returns (uint256 totalAuthorized, uint256 totalVoted, uint256 participationPercentage)",
        "function getCandidate(uint256 _index) view returns (string name, uint256 voteCount)",
        "function getWinnerName() view returns (string)",
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

  /**
   * Busca voto específico por hash de transação
   */
  async searchVote(txHash) {
    try {
      console.log('🔍 Buscando transação...');
      
      const tx = await this.provider.getTransaction(txHash);
      
      if (!tx) {
        throw new Error('Transação não encontrada na blockchain');
      }
      
      // Verificar se é uma transação para o contrato correto
      if (tx.to.toLowerCase() !== this.contract.target.toLowerCase()) {
        throw new Error(
          `Transação inválida! ` +
          `A transação foi enviada para: ${tx.to} ` +
          `Contrato de votação esperado: ${this.contract.target}`
        );
      }
      
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error('Receipt da transação não encontrado');
      }
      
      if (receipt.status !== 1) {
        throw new Error('A transação falhou na blockchain');
      }
      
      const block = await this.provider.getBlock(tx.blockNumber);
      
      console.log('📦 Bloco:', block.number);
      console.log('⏰ Timestamp:', new Date(block.timestamp * 1000).toISOString());
      
      // Buscar o evento de voto específico
      const filter = this.contract.filters.VoteSubmitted();
      const events = await this.contract.queryFilter(filter, block.number, block.number);
      
      const voteEvent = events.find(e => e.transactionHash === txHash);
      
      if (!voteEvent) {
        throw new Error('Esta transação não contém um evento de voto válido');
      }
      
      // Encontrar índice do voto
      const allEvents = await this.contract.queryFilter(filter, 0, block.number);
      const voteIndex = allEvents.findIndex(e => e.transactionHash === txHash);
      
      if (voteIndex === -1) {
        throw new Error('Erro ao determinar o índice do voto no contrato');
      }
      
      const voteData = await this.contract.getVote(voteIndex);
      
      console.log('✓ Voto #' + (voteIndex + 1) + ' encontrado');
      
      return {
        txHash,
        blockNumber: block.number,
        blockHash: block.hash,
        voteIndex: voteIndex + 1,
        timestamp: new Date(Number(voteData[2]) * 1000).toISOString(),
        relayer: voteData[3],
        encryptedValues: this.config.candidateNames.map((name, idx) => ({
          candidate: name,
          c1: voteData[0][idx].toString(),
          c2: voteData[1][idx].toString()
        })),
        confirmations: await this.provider.getBlockNumber() - block.number
      };
      
    } catch (error) {
      console.error('Erro ao buscar voto:', error);
      throw error;
    }
  }

  /**
   * Obtém resultados finais da eleição
   * Requer fase Ended
   */
  async getElectionResults() {
    try {
      console.log('📊 Processando resultados da eleição...');

      // Verificar se votação encerrou
      const phase = await this.contract.phase();
      const phaseNumber = Number(phase);
      console.log(`   Fase retornada pelo contrato: ${phase} (tipo: ${typeof phase})`);
      console.log(`   Fase convertida: ${phaseNumber}`);
      if (phase !== 2) {
        throw new Error('Eleição ainda não foi encerrada');
      }

      // Obter total de votos
      const totalVotes = await this.contract.getTotalVotes();
      console.log(`📮 Total de votos: ${totalVotes}`);

      // Obter estatísticas de eleitores
      const voterStats = await this.contract.getVoterStats();
      console.log(`👥 Eleitores autorizados: ${voterStats.totalAuthorized}`);
      console.log(`✅ Participação: ${voterStats.participationPercentage}%`);

      // Buscar resultados de cada candidato
      const candidateResults = [];
      for (let i = 0; i < this.config.numCandidates; i++) {
        const candidateData = await this.contract.getCandidate(i);
        candidateResults.push({
          index: i,
          name: candidateData.name,
          voteCount: candidateData.voteCount.toString()
        });
        console.log(`  ${candidateData.name}: ${candidateData.voteCount} votos`);
      }

      // Buscar vencedor
      const winnerName = await this.contract.getWinnerName();
      const winner = candidateResults.find(c => c.name === winnerName);
      
      console.log(`\n🏆 Vencedor: ${winnerName}`);

      return {
        timestamp: new Date().toISOString(),
        votingEnded: true,
        totalVotes: totalVotes.toString(),
        candidates: candidateResults,
        winner: {
          name: winnerName,
          index: winner.index,
          voteCount: winner.voteCount
        },
        participation: {
          authorized: voterStats.totalAuthorized.toString(),
          voted: voterStats.totalVoted.toString(),
          percentage: voterStats.participationPercentage.toString()
        }
      };

    } catch (error) {
      console.error('Erro ao obter resultados:', error);
      throw error;
    }
  }
}

// Exportar instância única (Singleton)
const blockchainService = new BlockchainService();

module.exports = blockchainService;