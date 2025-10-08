/**
 * Arquivo principal do ElGamal Utils
 * Re-exporta todas as funções dos módulos especializados
 * Mantém compatibilidade com código existente
 */

// Importar funções de criptografia básica
const {
    modPow,
    modInverse,
    generateRandom,
    encryptVote,
    decryptValue,
    validateEncryptedVote
} = require('./elgamal-crypto');

// Importar funções de provas zero-knowledge
const {
    generateDecryptionProof,
    verifyDecryptionProof
} = require('./elgamal-proof');

// Importar funções de agregação homomórfica
const {
    homomorphicAggregation,
    decryptAggregatedResults,
    babyStepGiantStep,
    HeliosDecoder
} = require('./elgamal-aggregation');

// Importar funções de configuração
const {
    loadElGamalParams,
    loadPublicConfig,
    getContractConfig,
    CONFIG,
    CONTRACT_INSTANCE
} = require('./elgamal-config');

// Re-exportar tudo
module.exports = {
    // Funções de criptografia básica
    modPow,
    modInverse,
    generateRandom,
    encryptVote,
    decryptValue,
    validateEncryptedVote,
    
    // Funções de provas zero-knowledge
    generateDecryptionProof,
    verifyDecryptionProof,
    
    // Funções de agregação homomórfica
    homomorphicAggregation,
    decryptAggregatedResults,
    babyStepGiantStep,
    HeliosDecoder,
    
    // Funções de configuração
    loadElGamalParams,
    loadPublicConfig,
    getContractConfig,
    CONFIG,
    CONTRACT_INSTANCE
};