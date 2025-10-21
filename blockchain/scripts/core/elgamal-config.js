const fs = require('fs');

let CONFIG = null;
let CONTRACT_INSTANCE = null;

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
            params: {
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
    loadPublicConfig,
    getContractConfig,
    CONFIG,
    CONTRACT_INSTANCE
};