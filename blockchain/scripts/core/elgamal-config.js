const fs = require('fs');

let CONFIG = null;
let CONTRACT_INSTANCE = null;

// Função para carregar parâmetros do arquivo
async function loadElGamalParams() {
    const paramsFile = 'elgamal-params.json';
    
    if (!fs.existsSync(paramsFile)) {
        console.error("❌ Arquivo elgamal-params.json não encontrado!");
        console.log("   Execute primeiro: node scripts/elgamal-params-generator.js");
        process.exit(1);
    }
    
    const params = JSON.parse(fs.readFileSync(paramsFile, 'utf8'));
    
    // Converter strings para BigInt
    const localParams = {
        p: BigInt(params.p),
        g: BigInt(params.g),
        h: BigInt(params.h),
        x: BigInt(params.x),
        generated: params.generated,
        bits: params.bits
    };

    // Validar com o contrato se disponível
    if (CONTRACT_INSTANCE) {
        const [prime, generator, publicKey] = await CONTRACT_INSTANCE.getElGamalParameters();
        if (localParams.p !== BigInt(prime) || localParams.g !== BigInt(generator) || localParams.h !== BigInt(publicKey)) {
            console.error("⚠️ Parâmetros locais não correspondem aos do contrato!");
            throw new Error("Incompatibilidade de parâmetros ElGamal");
        }
    }
    
    return localParams;
}

async function loadPublicConfig() {
    const publicConfigFile = 'public-config.json';
    if (!fs.existsSync(publicConfigFile)) {
        throw new Error("Arquivo de configuração pública não encontrado");
    }
    
    return JSON.parse(fs.readFileSync(publicConfigFile, 'utf8'));
}

async function getContractConfig() {
    if (!CONFIG) {
        console.log("📄 Carregando configuração inicial...");
        
        const publicConfig = await loadPublicConfig();
        const ELGAMAL_PARAMS = publicConfig.elgamalParams;
        
        const ElGamalVoting = await hre.ethers.getContractFactory("ElGamalVoting");
        CONTRACT_INSTANCE = ElGamalVoting.attach(publicConfig.contract);
        
        CONFIG = {
            contract: CONTRACT_INSTANCE,
            candidateNames: publicConfig.candidateNames,
            numCandidates: publicConfig.numCandidates,
            publicKey: {
                p: BigInt(ELGAMAL_PARAMS.p),
                g: BigInt(ELGAMAL_PARAMS.g),
                h: BigInt(ELGAMAL_PARAMS.h)
            },
            network: publicConfig.network,
            deployedAt: publicConfig.votingStarted
        };
        
        console.log("✅ Configuração estática carregada");
    }
    
    // Usar getVotingStatus para pegar tudo de uma vez
    const [isEnded, hasResults, totalVotes, totalCandidates] = await CONTRACT_INSTANCE.getVotingStatus();
    
    return {
        ...CONFIG,
        votingEnded: isEnded,
        resultsPublished: hasResults,
        totalVotes: totalVotes.toString(),
        totalCandidates: totalCandidates.toString()
    };
}

module.exports = {
    loadElGamalParams,
    loadPublicConfig,
    getContractConfig,
    CONFIG,
    CONTRACT_INSTANCE
};