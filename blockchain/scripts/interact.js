const hre = require("hardhat");
const { encryptVote, validateEncryptedVote, generateRandom, modPow } = require('./elgamal-utils');
const fs = require('fs');
require('dotenv').config();

// ==================== CONFIGURAÇÃO ====================

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
        console.log("🔄 Carregando configuração inicial...");
        
        const publicConfig = await loadPublicConfig();
        const ELGAMAL_PARAMS = publicConfig.elgamalParams;
        
        const Ballot = await hre.ethers.getContractFactory("Ballot");
        CONTRACT_INSTANCE = Ballot.attach(publicConfig.contract);
        
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
    
    const votingStatus = await CONTRACT_INSTANCE.getVotingStatus();
    
    if (votingStatus.isEnded) {
        throw new Error("VOTAÇÃO ENCERRADA: O contrato não está mais aceitando votos");
    }
    
    return CONFIG;
}

// ==================== FUNÇÕES DE VALIDAÇÃO ====================

async function validateVoter(contract, voterAddress) {
    console.log("🔍 Validando eleitor no contrato...");
    
    
        const hasRight = await contract.hasRightToVote(voterAddress);
        if (!hasRight) {
            throw new Error("ELEITOR NÃO AUTORIZADO: Endereço não tem direito de voto");
        }
        
        const hasVoted = await contract.hasVoted(voterAddress);
        if (hasVoted) {
            throw new Error("ELEITOR JÁ VOTOU: Este endereço já registrou seu voto");
        }
        
        console.log("✅ Eleitor validado e apto para votar");
        return true;   
}

// ==================== FUNÇÃO PRINCIPAL DE VOTAÇÃO ====================

async function submitVote(voterAddress, candidateIndex) {
    try {
        const config = await getContractConfig();
        
        if (candidateIndex < 0 || candidateIndex >= config.numCandidates) {
            return {
                success: false,
                error: `Índice de candidato inválido. Escolha entre 0 e ${config.numCandidates - 1}`
            };
        }
        
        await validateVoter(config.contract, voterAddress);
        
        const { c1_values, c2_values } = encryptVote(
            candidateIndex, 
            config.numCandidates, 
            config.publicKey
        );

        const validation = validateEncryptedVote(c1_values, c2_values, config.numCandidates);
        if (!validation.valid) {
            throw new Error(`Erro na cifragem: ${validation.error}`);
        }
        
        
        const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
        if (!relayerPrivateKey) {
            throw new Error("Chave privada do relayer não configurada");
        }
        
        const relayerWallet = new hre.ethers.Wallet(relayerPrivateKey, hre.ethers.provider);
        
        console.log("📤 Enviando voto para blockchain...");
        const tx = await config.contract.connect(relayerWallet).submitEncryptedVote(
            c1_values,
            c2_values,
            voterAddress
        );
        
        console.log("⏳ Aguardando confirmação...");
        const receipt = await tx.wait();
        
        return {
            success: true,
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            candidate: config.candidateNames[candidateIndex]
        };
        
    } catch (error) {
        console.error("❌ Erro ao processar voto:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// ==================== TESTE STANDALONE ====================

// Se executado diretamente (não importado)
if (require.main === module) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    function question(query) {
        return new Promise(resolve => rl.question(query, resolve));
    }
    
    async function main() {
        try {
            console.log("\n🗳️  SISTEMA DE VOTAÇÃO \n");
            
            const config = await getContractConfig();
            
            console.log("📊 Eleição Ativa");
            console.log("📅 Iniciada em:", config.deployedAt);
            console.log("🌐 Rede:", config.network);
            console.log("\n👥 Candidatos:");
            config.candidateNames.forEach((name, idx) => {
                console.log(`   ${idx + 1}. ${name}`);
            });
            
            const voterAddress = await question("\n🔍 Endereço do eleitor: ");
            
            try {
                await validateVoter(config.contract, voterAddress);
                console.log("✅ Eleitor autorizado e pode votar");
            } catch (error) {
                console.log(`\n❌ ${error.message}`);
                rl.close();
                process.exit(1);
            }
            
            const choice = await question(`\n🗳 Escolha o candidato (1-${config.candidateNames.length}): `);
            const candidateIndex = parseInt(choice) - 1;
            
            console.log("\n⏳ Processando voto...");
            const result = await submitVote(voterAddress, candidateIndex);
            
            if (result.success) {
                console.log("\n✅ VOTO REGISTRADO COM SUCESSO!");
                console.log(`📋 Transação: ${result.txHash}`);
                console.log(`📦 Bloco: ${result.blockNumber}`);
                console.log(`⛽ Gas usado: ${result.gasUsed}`);
                console.log(`👤 Candidato: ${result.candidate}`);
            } else {
                console.log(`\n❌ Erro: ${result.error}`);
            }
            
            rl.close();
            
        } catch (error) {
            console.error("\n❌ Erro:", error.message);
            
            if (error.message.includes("VOTAÇÃO ENCERRADA")) {
                console.log("\n📊 A eleição já foi finalizada e não aceita mais votos.");
                console.log("🔍 Verifique os resultados através do script de apuração.\n");
            }
            
            rl.close();
            process.exit(1);
        }
    }
    
    main();
}