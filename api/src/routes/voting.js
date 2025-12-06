const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

/**
 * POST /api/voting/authenticate
 * Autentica eleitor via endereço público
 */
router.post('/authenticate', async (req, res) => {
  try {
    const { voterAddress } = req.body;

    console.log('\n=== AUTENTICAÇÃO DE ELEITOR ===');
    console.log('📍 Endereço recebido:', voterAddress);

    if (!voterAddress || !voterAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.log('❌ Endereço inválido');
      return res.status(400).json({
        success: false,
        error: 'Endereço Ethereum inválido'
      });
    }

    // Verificar fase
    const phase = await blockchainService.getCurrentPhase();
    console.log('📊 Fase atual:', phase.phaseName);
    
    if (phase.phaseNumber !== 1) {
      console.log('❌ Fase incorreta para votação');
      return res.status(400).json({
        success: false,
        error: `Votação não disponível. Fase atual: ${phase.phaseName}`
      });
    }

    // Verificar se tem direito de voto
    console.log('🔍 Verificando direito de voto...');
    const hasRight = await blockchainService.hasRightToVote(voterAddress);
    console.log('✓ Tem direito:', hasRight);
    
    if (!hasRight) {
      console.log('❌ Não autorizado');
      return res.status(400).json({
        success: false,
        error: 'Endereço não autorizado a votar. Complete o cadastro primeiro.'
      });
    }

    // Verificar se já votou
    console.log('🔍 Verificando se já votou...');
    const hasVoted = await blockchainService.hasVoted(voterAddress);
    console.log('✓ Já votou:', hasVoted);
    
    if (hasVoted) {
      console.log('❌ Já votou anteriormente');
      return res.status(400).json({
        success: false,
        error: 'Este endereço já registrou seu voto'
      });
    }

    // Buscar candidatos
    console.log('📋 Buscando candidatos...');
    const candidates = await blockchainService.getCandidates();
    console.log(`✓ ${candidates.length} candidatos encontrados`);

    // Buscar parâmetros ElGamal
    console.log('🔐 Buscando parâmetros ElGamal...');
    const elgamalParams = await blockchainService.getElGamalParams();
    console.log('✓ Parâmetros obtidos');

    console.log('✅ Autenticação bem-sucedida\n');

    return res.json({
      success: true,
      voterAddress,
      candidates,
      elgamalParams,
      message: 'Eleitor autenticado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro em authenticate:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao autenticar eleitor'
    });
  }
});

/**
 * POST /api/voting/submit
 * Submete voto cifrado para a blockchain
 */
router.post('/submit', async (req, res) => {
  try {
    const { voterAddress, c1_values, c2_values, signature } = req.body;

    console.log('\n=== SUBMISSÃO DE VOTO ===');
    console.log('📍 Eleitor:', voterAddress);

    if (!voterAddress || !c1_values || !c2_values || !signature) {
      console.log('❌ Dados incompletos');
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos'
      });
    }

    // Validar formato do endereço
    if (!voterAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.log('❌ Endereço inválido');
      return res.status(400).json({
        success: false,
        error: 'Endereço Ethereum inválido'
      });
    }

    // Validar arrays de valores cifrados
    if (!Array.isArray(c1_values) || !Array.isArray(c2_values)) {
      console.log('❌ Arrays inválidos');
      return res.status(400).json({
        success: false,
        error: 'Valores cifrados inválidos'
      });
    }

    if (c1_values.length !== c2_values.length) {
      console.log('❌ Arrays de tamanhos diferentes');
      return res.status(400).json({
        success: false,
        error: 'Arrays de valores cifrados devem ter o mesmo tamanho'
      });
    }

    console.log(`📊 Valores cifrados: ${c1_values.length} candidatos`);
    console.log('📤 Submetendo voto via relayer...');

    // Submeter voto via relayer
    const result = await blockchainService.submitVote(
      voterAddress,
      c1_values,
      c2_values,
      signature
    );

    console.log('✅ Voto registrado com sucesso');
    console.log('📋 TX Hash:', result.transactionHash);
    console.log('📦 Bloco:', result.blockNumber);
    console.log('');

    return res.json({
      success: true,
      message: 'Voto registrado com sucesso',
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber
    });

  } catch (error) {
    console.error('❌ Erro em submit:', error);
    
    if (error.message.includes('Eleitor ja votou') || error.message.includes('already voted')) {
      return res.status(400).json({
        success: false,
        error: 'Eleitor já registrou seu voto'
      });
    }

    if (error.message.includes('Assinatura invalida') || error.message.includes('Invalid signature')) {
      return res.status(400).json({
        success: false,
        error: 'Assinatura digital inválida. Verifique sua chave privada.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro ao registrar voto'
    });
  }
});

/**
 * GET /api/voting/verify/:address
 * Verifica se endereço já votou
 */
router.get('/verify/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Endereço inválido'
      });
    }

    const hasRight = await blockchainService.hasRightToVote(address);
    const hasVoted = await blockchainService.hasVoted(address);

    return res.json({
      success: true,
      registered: hasRight,
      hasVoted
    });

  } catch (error) {
    console.error('Erro em verify:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao verificar endereço'
    });
  }
});

/**
 * GET /api/voting/search/:txHash
 * Busca voto específico por hash de transação
 */
router.get('/search/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    console.log('\n=== BUSCA DE VOTO ===');
    console.log('📍 TX Hash:', txHash);

    if (!txHash || !txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      console.log('❌ Hash inválido');
      return res.status(400).json({
        success: false,
        error: 'Hash de transação inválido. Deve ter 66 caracteres (0x + 64 hex)'
      });
    }

    // Buscar voto
    const voteInfo = await blockchainService.searchVote(txHash);

    if (!voteInfo) {
      console.log('❌ Voto não encontrado');
      return res.status(404).json({
        success: false,
        error: 'Voto não encontrado para este hash de transação'
      });
    }

    console.log('✅ Voto encontrado\n');

    return res.json({
      success: true,
      vote: voteInfo
    });

  } catch (error) {
    console.error('❌ Erro em search:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar voto'
    });
  }
});

/**
 * GET /api/voting/results
 * Retorna resultados finais da eleição
 */
router.get('/results', async (req, res) => {
  try {
    console.log('\n=== RESULTADOS DA ELEIÇÃO ===');

    // Verificar fase
    const phase = await blockchainService.getCurrentPhase();
    console.log('📊 Fase atual:', phase.phaseName);

    // Permitir ver resultados se fase Ended (2) OU se já há resultados publicados
    const votingStatus = await blockchainService.contract.getVotingStatus();
    const canViewResults = phase.phaseNumber === 2 || votingStatus.hasResults;

    if (!canViewResults) {
      console.log('⚠️ Resultados só disponíveis após encerramento');
      return res.status(400).json({
        success: false,
        error: `Resultados disponíveis apenas após o encerramento da votação. Fase atual: ${phase.phaseName}`
      });
    }

    // Buscar resultados
    const results = await blockchainService.getElectionResults();

    console.log('✅ Resultados obtidos\n');

    return res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Erro em results:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar resultados da eleição'
    });
  }
});

module.exports = router;