const fs = require('fs');
const path = require('path');
const hre = require("hardhat");

let CONFIG = null;
let CONTRACT_INSTANCE = null;

async function loadPublicConfig() {
    const publicConfigFile = path.join(__dirname, '..', '..', 'config', 'public-config.json');
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
        
        const Ballot = await hre.ethers.getContractFactory("Ballot");
        CONTRACT_INSTANCE = Ballot.attach(publicConfig.contract);
        
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