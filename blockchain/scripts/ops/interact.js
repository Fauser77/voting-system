const hre = require("hardhat");
const {getContractConfig, encryptVote, validateEncryptedVote } = require('./elgamal-utils');
const fs = require('fs');
require('dotenv').config();

// ==================== FUNÇÕES DE VALIDAÇÃO ====================

async function validateVoter(contract, voterAddress) {    
    try {
        console.log("🔍 Validando eleitor no contrato...");
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout na validação")), 30000)
        );
        
        const hasRight = await Promise.race([
            contract.hasRightToVote(voterAddress),
            timeoutPromise
        ]);
        if (!hasRight) {
            throw new Error("ELEITOR NÃO AUTORIZADO: Endereço não tem direito de voto");
        }

        const hasVoted = await Promise.race([
            contract.hasVoted(voterAddress),
            timeoutPromise
        ]);
        if (hasVoted) {
            throw new Error("ELEITOR JÁ VOTOU: Este endereço já registrou seu voto");
        }

        console.log("✅ Eleitor validado e apto para votar");
        return true;
    } catch (error) {
        if (error.code === 'NETWORK_ERROR') {
            throw new Error("Erro de rede ao validar eleitor");
        }
        throw error;
    }  
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
        
        console.log("🔐 Cifrando voto com ElGamal...");
        const { c1_values, c2_values } = encryptVote(
            candidateIndex, 
            config.numCandidates, 
            config.params
        );
        console.log("✅ Voto cifrado com sucesso");

        console.log("🔍 Validando integridade da cifragem...");    
        const validation = validateEncryptedVote(c1_values, c2_values, config.numCandidates, config.params.p);
        if (!validation.valid) {
            throw new Error(`Erro na cifragem: ${validation.error}`);
        }
        console.log("✅ Cifragem validada");
        
        const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
        if (!relayerPrivateKey || relayerPrivateKey.length !== 66) { // 0x + 64 chars
            throw new Error("Chave privada do relayer inválida ou não configurada");
        }
        if (!relayerPrivateKey.startsWith('0x')) {
            throw new Error("Chave privada deve começar com '0x'");
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

        const voterStatus = await config.contract.hasVoted(voterAddress);
        if (!voterStatus) {
            throw new Error("Falha na confirmação do voto na blockchain");
        }
        
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