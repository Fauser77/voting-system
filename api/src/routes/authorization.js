const express = require('express');
const router = express.Router();
const blockchainService = require('../services/blockchainService');

/**
 * POST /api/authorization/validate-cpf
 * Valida CPF (off-chain + on-chain)
 */
router.post('/validate-cpf', async (req, res) => {
  try {
    const { cpf } = req.body;

    if (!cpf || !/^\d{11}$/.test(cpf)) {
      return res.status(400).json({
        success: false,
        error: 'CPF inválido. Use 11 números.'
      });
    }

    // 1. Validar off-chain
    const isAuthorized = await blockchainService.checkCPFOffChain(cpf);
    if (!isAuthorized) {
      return res.status(400).json({
        success: false,
        error: 'CPF não autorizado para esta eleição'
      });
    }

    // 2. Gerar hash
    const cpfHash = blockchainService.hashCPF(cpf);

    // 3. Validar on-chain (já foi usado?)
    const isAvailable = await blockchainService.checkCPFOnChain(cpfHash);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        error: 'Este CPF já foi utilizado para gerar chaves'
      });
    }

    // 4. Verificar fase
    const phase = await blockchainService.getCurrentPhase();
    if (phase.phaseNumber !== 0) {
      return res.status(400).json({
        success: false,
        error: `Cadastro encerrado. Fase atual: ${phase.phaseName}`
      });
    }

    return res.json({
      success: true,
      message: 'CPF validado com sucesso',
      cpfHash: cpfHash
    });

  } catch (error) {
    console.error('Erro em validate-cpf:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao validar CPF'
    });
  }
});

/**
 * POST /api/authorization/register
 * Registra eleitor no blockchain
 */
router.post('/register', async (req, res) => {
  try {
    const { voterAddress, cpfHash } = req.body;

    if (!voterAddress || !cpfHash) {
      return res.status(400).json({
        success: false,
        error: 'Endereço e hash do CPF são obrigatórios'
      });
    }

    // Validar formatos
    if (!voterAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Endereço Ethereum inválido'
      });
    }

    if (!cpfHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Hash do CPF inválido'
      });
    }

    // Dupla checagem
    const isAvailable = await blockchainService.checkCPFOnChain(cpfHash);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        error: 'CPF já foi registrado'
      });
    }

    // Registrar
    const result = await blockchainService.registerVoter(voterAddress, cpfHash);

    // Atualizar config
    await blockchainService.updateElectionConfig(voterAddress);

    return res.json({
      success: true,
      message: 'Eleitor registrado com sucesso',
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber
    });

  } catch (error) {
    console.error('Erro em register:', error);
    
    if (error.message.includes('Cadastro encerrado')) {
      return res.status(400).json({
        success: false,
        error: 'Período de cadastro encerrado'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erro ao registrar eleitor'
    });
  }
});

/**
 * GET /api/authorization/stats
 * Estatísticas do sistema
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await blockchainService.getStats();
    
    return res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Erro em stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao obter estatísticas'
    });
  }
});

/**
 * GET /api/authorization/health
 * Health check
 */
router.get('/health', async (req, res) => {
  try {
    const status = await blockchainService.healthCheck();
    
    return res.json({
      success: true,
      status: status.connected ? 'operational' : 'error',
      blockchain: status
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

module.exports = router;