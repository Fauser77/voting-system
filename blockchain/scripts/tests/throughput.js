/**
 * BENCHMARK DE THROUGHPUT - Sistema de Votação Blockchain
 * 
 * Objetivo: Medir capacidade real de votos por bloco e throughput do sistema
 * 
 * Métricas coletadas:
 * - Gas consumido por voto
 * - Votos por bloco (capacidade real)
 * - TPS (transações por segundo)
 * - Distribuição de votos nos blocos
 * 
 * OTIMIZAÇÃO: Registro de eleitores em lotes com controle de nonce
 */

const hre = require("hardhat");
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ==================== CONFIGURAÇÃO ====================

const CONFIG = {
    // Chaves (do .env ou hardcoded para teste)
    ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY || '0x4b303ac43aaaee7491caebd674f22356343b7fbfa936e3b313564fc4132ef744',
    RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY || '0xe4e79abf49209e47d9082c5544600c83fc0a9249394bdf9d691491f7723f9a4c',
    
    // Parâmetros do benchmark
    NUM_VOTERS: 20000,        // Quantidade de eleitores a registrar e votar
    NUM_CANDIDATES: 3,      // Candidatos na eleição
    
    // Parâmetros de otimização
    REGISTRATION_BATCH_SIZE: 200,  // Tamanho do lote para registro
    
    // Rede
    BLOCK_GAS_LIMIT: 20000000,
    BLOCK_TIME: 5,          // segundos
    
    // Arquivo de saída
    OUTPUT_DIR: './benchmark-results'
};

// ==================== FUNÇÕES AUXILIARES ELGAMAL ====================

function modPow(base, exponent, modulus) {
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent % 2n === 1n) {
            result = (result * base) % modulus;
        }
        exponent = exponent / 2n;
        base = (base * base) % modulus;
    }
    return result;
}

function generateRandom(p) {
    return BigInt('0x' + crypto.randomBytes(32).toString('hex')) % (p - 2n) + 1n;
}

function encryptVote(candidateIndex, numCandidates, params) {
    const voteArray = new Array(numCandidates).fill(0);
    voteArray[candidateIndex] = 1;
    
    const c1_values = [];
    const c2_values = [];
    
    for (let i = 0; i < voteArray.length; i++) {
        const m = BigInt(voteArray[i]);
        const r = generateRandom(params.p);
        
        const c1 = modPow(params.g, r, params.p);
        const h_r = modPow(params.h, r, params.p);
        const g_m = modPow(params.g, m, params.p);
        const c2 = (h_r * g_m) % params.p;
        
        c1_values.push(c1);
        c2_values.push(c2);
    }
    
    return { c1_values, c2_values };
}

async function signVoteData(voteData, privateKey) {
    const wallet = new hre.ethers.Wallet(privateKey);
    const abiCoder = hre.ethers.AbiCoder.defaultAbiCoder();
    const encodedData = abiCoder.encode(
        ["uint256[]", "uint256[]"],
        [voteData.c1_values, voteData.c2_values]
    );
    const messageHash = hre.ethers.keccak256(encodedData);
    const messageHashBytes = hre.ethers.getBytes(messageHash);
    const signature = await wallet.signMessage(messageHashBytes);
    return signature;
}

// ==================== FUNÇÕES PRINCIPAIS ====================

async function deployFreshContract(adminWallet, relayerAddress, elgamalParams) {
    console.log("\n📦 Fazendo deploy de novo contrato para benchmark...");
    
    const candidateNames = ["Candidato A", "Candidato B", "Candidato C"];
    
    const Ballot = await hre.ethers.getContractFactory("Ballot", adminWallet);
    const contract = await Ballot.deploy(
        elgamalParams.p,
        elgamalParams.g,
        elgamalParams.h,
        candidateNames,
        [relayerAddress]
    );
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`✅ Contrato deployado em: ${address}`);
    
    return contract;
}

async function registerVotersFast(contract, adminWallet, voters) {
    console.log(`\n📝 Registrando ${voters.length} eleitores (modo otimizado em lotes)...`);
    
    const startTime = Date.now();
    const BATCH_SIZE = CONFIG.REGISTRATION_BATCH_SIZE;
    const allReceipts = [];
    
    // Garantir que estamos na fase de registro
    const currentPhase = await contract.phase();
    if (Number(currentPhase) !== 0) {
        console.log("  Mudando para fase de registro...");
        const tx = await contract.connect(adminWallet).setPhase(0);
        await tx.wait();
    }
    
    const totalBatches = Math.ceil(voters.length / BATCH_SIZE);
    console.log(`  Processando em ${totalBatches} lotes de até ${BATCH_SIZE} eleitores...`);
    
    for (let batch = 0; batch < voters.length; batch += BATCH_SIZE) {
        const batchStart = Date.now();
        const batchVoters = voters.slice(batch, batch + BATCH_SIZE);
        const batchNumber = Math.floor(batch / BATCH_SIZE) + 1;
        
        // Pegar nonce atual
        let nonce = await adminWallet.getNonce();
        
        // Enviar todas as transações do lote sem esperar
        const pendingTxs = [];
        for (let i = 0; i < batchVoters.length; i++) {
            const voter = batchVoters[i];
            const cpfHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`cpf-benchmark-${batch + i}`));
            
            const tx = await contract.connect(adminWallet).registerVoterWithCPF(
                voter.address, 
                cpfHash,
                { nonce: nonce++ }
            );
            pendingTxs.push(tx);
        }
        
        // Esperar todas as transações do lote confirmarem
        const receipts = await Promise.all(pendingTxs.map(tx => tx.wait()));
        allReceipts.push(...receipts);
        
        const batchTime = ((Date.now() - batchStart) / 1000).toFixed(2);
        const progress = Math.min(batch + BATCH_SIZE, voters.length);
        console.log(`  Lote ${batchNumber}/${totalBatches}: ${batchVoters.length} eleitores em ${batchTime}s | Total: ${progress}/${voters.length}`);
    }
    
    const endTime = Date.now();
    const totalTimeSeconds = (endTime - startTime) / 1000;
    const gasUsed = allReceipts.map(r => r.gasUsed);
    const avgGas = gasUsed.reduce((a, b) => a + BigInt(b), 0n) / BigInt(gasUsed.length);
    
    console.log(`\n✅ Registro concluído em ${totalTimeSeconds.toFixed(2)}s`);
    console.log(`   Velocidade: ${(voters.length / totalTimeSeconds).toFixed(2)} registros/segundo`);
    
    // Mudar para fase de votação
    console.log("  Mudando para fase de votação...");
    const tx = await contract.connect(adminWallet).setPhase(1);
    await tx.wait();
    
    return {
        totalTime: endTime - startTime,
        gasUsed,
        avgGas
    };
}

async function submitVotesInBurst(contract, relayerWallet, voters, elgamalParams) {
    console.log(`\n🗳️  Submetendo ${voters.length} votos em rajada...`);
    
    const provider = hre.ethers.provider;
    const startBlock = await provider.getBlockNumber();
    const startTime = Date.now();
    
    // Preparar todos os votos (criptografia + assinatura)
    console.log("  Preparando votos (criptografia + assinatura)...");
    const preparedVotes = [];
    
    for (let i = 0; i < voters.length; i++) {
        const candidateIndex = i % CONFIG.NUM_CANDIDATES; // Distribui entre candidatos
        const encrypted = encryptVote(candidateIndex, CONFIG.NUM_CANDIDATES, elgamalParams);
        const signature = await signVoteData(encrypted, voters[i].privateKey);
        
        preparedVotes.push({
            voter: voters[i],
            encrypted,
            signature,
            candidateIndex
        });
        
        if ((i + 1) % 20 === 0) {
            process.stdout.write(`  Preparados: ${i + 1}/${voters.length}\r`);
        }
    }
    console.log(`\n  ✅ ${preparedVotes.length} votos preparados`);
    
    // Submeter todos os votos SEM esperar confirmação individual
    console.log("  Submetendo transações...");
    const pendingTxs = [];
    
    for (let i = 0; i < preparedVotes.length; i++) {
        const vote = preparedVotes[i];
        
        const tx = await contract.connect(relayerWallet).submitEncryptedVote(
            vote.encrypted.c1_values,
            vote.encrypted.c2_values,
            vote.signature,
            vote.voter.address,
            { gasLimit: 500000 } // Limite de gas por transação
        );
        
        pendingTxs.push({
            tx,
            index: i,
            voter: vote.voter.address
        });
        
        if ((i + 1) % 20 === 0) {
            process.stdout.write(`  Submetidos: ${i + 1}/${voters.length}\r`);
        }
    }
    console.log(`\n  ✅ ${pendingTxs.length} transações submetidas`);
    
    // Aguardar todas as confirmações
    console.log("  Aguardando confirmações...");
    const receipts = [];
    
    for (const pending of pendingTxs) {
        try {
            const receipt = await pending.tx.wait();
            receipts.push({
                index: pending.index,
                voter: pending.voter,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed,
                txHash: receipt.hash
            });
        } catch (error) {
            console.error(`  ❌ Erro no voto ${pending.index}: ${error.message}`);
        }
    }
    
    const endTime = Date.now();
    const endBlock = await provider.getBlockNumber();
    
    console.log(`\n✅ Votação concluída!`);
    console.log(`  Votos confirmados: ${receipts.length}/${voters.length}`);
    console.log(`  Blocos utilizados: ${startBlock} até ${endBlock} (${endBlock - startBlock + 1} blocos)`);
    console.log(`  Tempo total: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    
    return {
        receipts,
        startBlock,
        endBlock,
        startTime,
        endTime,
        totalTime: endTime - startTime
    };
}

function analyzeResults(votingResults, registrationResults) {
    const { receipts, startBlock, endBlock, totalTime } = votingResults;
    
    console.log("\n📊 ANÁLISE DOS RESULTADOS");
    console.log("=".repeat(50));
    
    // 1. Distribuição por bloco
    const blockDistribution = {};
    for (const receipt of receipts) {
        const block = receipt.blockNumber;
        if (!blockDistribution[block]) {
            blockDistribution[block] = {
                count: 0,
                gasTotal: 0n,
                votes: []
            };
        }
        blockDistribution[block].count++;
        blockDistribution[block].gasTotal += receipt.gasUsed;
        blockDistribution[block].votes.push(receipt.index);
    }
    
    console.log("\n📦 DISTRIBUIÇÃO POR BLOCO:");
    const blocks = Object.keys(blockDistribution).sort((a, b) => Number(a) - Number(b));
    let maxVotesPerBlock = 0;
    
    for (const block of blocks) {
        const data = blockDistribution[block];
        const avgGas = data.gasTotal / BigInt(data.count);
        console.log(`  Bloco ${block}: ${data.count} votos | Gas total: ${data.gasTotal} | Gas médio: ${avgGas}`);
        if (data.count > maxVotesPerBlock) {
            maxVotesPerBlock = data.count;
        }
    }
    
    // 2. Estatísticas de Gas
    const gasValues = receipts.map(r => r.gasUsed);
    const totalGas = gasValues.reduce((a, b) => a + b, 0n);
    const avgGas = totalGas / BigInt(receipts.length);
    const minGas = gasValues.reduce((a, b) => a < b ? a : b);
    const maxGas = gasValues.reduce((a, b) => a > b ? a : b);
    
    console.log("\n⛽ ESTATÍSTICAS DE GAS (por voto):");
    console.log(`  Mínimo: ${minGas}`);
    console.log(`  Máximo: ${maxGas}`);
    console.log(`  Média:  ${avgGas}`);
    console.log(`  Total:  ${totalGas}`);
    
    // 3. Throughput
    const totalTimeSeconds = totalTime / 1000;
    const votesPerSecond = receipts.length / totalTimeSeconds;
    const votesPerMinute = votesPerSecond * 60;
    const blocksUsed = blocks.length;
    const avgVotesPerBlock = receipts.length / blocksUsed;
    
    console.log("\n🚀 THROUGHPUT:");
    console.log(`  Votos por segundo: ${votesPerSecond.toFixed(2)}`);
    console.log(`  Votos por minuto:  ${votesPerMinute.toFixed(2)}`);
    console.log(`  Votos por bloco (média): ${avgVotesPerBlock.toFixed(2)}`);
    console.log(`  Votos por bloco (máximo): ${maxVotesPerBlock}`);
    
    // 4. Capacidade teórica vs real
    const theoreticalMaxPerBlock = Math.floor(CONFIG.BLOCK_GAS_LIMIT / Number(avgGas));
    const theoreticalTPS = theoreticalMaxPerBlock / CONFIG.BLOCK_TIME;
    
    console.log("\n📐 CAPACIDADE TEÓRICA vs REAL:");
    console.log(`  Gas limit do bloco: ${CONFIG.BLOCK_GAS_LIMIT.toLocaleString()}`);
    console.log(`  Gas médio por voto: ${avgGas}`);
    console.log(`  Máx teórico/bloco:  ${theoreticalMaxPerBlock}`);
    console.log(`  Máx real/bloco:     ${maxVotesPerBlock}`);
    console.log(`  TPS teórico:        ${theoreticalTPS.toFixed(2)}`);
    console.log(`  TPS real:           ${votesPerSecond.toFixed(2)}`);
    console.log(`  Eficiência:         ${((maxVotesPerBlock / theoreticalMaxPerBlock) * 100).toFixed(1)}%`);
    
    // 5. Registro de eleitores
    console.log("\n📝 REGISTRO DE ELEITORES:");
    console.log(`  Gas médio por registro: ${registrationResults.avgGas}`);
    console.log(`  Tempo total: ${(registrationResults.totalTime / 1000).toFixed(2)}s`);
    
    // Retornar dados para salvar
    return {
        timestamp: new Date().toISOString(),
        config: {
            numVoters: receipts.length,
            numCandidates: CONFIG.NUM_CANDIDATES,
            blockGasLimit: CONFIG.BLOCK_GAS_LIMIT,
            blockTime: CONFIG.BLOCK_TIME
        },
        voting: {
            totalVotes: receipts.length,
            totalTimeMs: totalTime,
            blocksUsed,
            startBlock,
            endBlock
        },
        gasStats: {
            min: minGas.toString(),
            max: maxGas.toString(),
            avg: avgGas.toString(),
            total: totalGas.toString()
        },
        throughput: {
            votesPerSecond: votesPerSecond.toFixed(4),
            votesPerMinute: votesPerMinute.toFixed(2),
            avgVotesPerBlock: avgVotesPerBlock.toFixed(2),
            maxVotesPerBlock
        },
        theoretical: {
            maxVotesPerBlock: theoreticalMaxPerBlock,
            tps: theoreticalTPS.toFixed(2),
            efficiency: ((maxVotesPerBlock / theoreticalMaxPerBlock) * 100).toFixed(1)
        },
        blockDistribution: Object.fromEntries(
            blocks.map(b => [b, {
                votes: blockDistribution[b].count,
                gasTotal: blockDistribution[b].gasTotal.toString()
            }])
        ),
        registration: {
            avgGas: registrationResults.avgGas.toString(),
            totalTimeMs: registrationResults.totalTime
        }
    };
}

// ==================== MAIN ====================

async function main() {
    console.log("=".repeat(60));
    console.log("   BENCHMARK DE THROUGHPUT - SISTEMA DE VOTAÇÃO");
    console.log("   (Modo Otimizado - Registro em Lotes)");
    console.log("=".repeat(60));
    console.log(`\n⚙️  Configuração:`);
    console.log(`   Eleitores: ${CONFIG.NUM_VOTERS}`);
    console.log(`   Candidatos: ${CONFIG.NUM_CANDIDATES}`);
    console.log(`   Gas limit/bloco: ${CONFIG.BLOCK_GAS_LIMIT.toLocaleString()}`);
    console.log(`   Tempo de bloco: ${CONFIG.BLOCK_TIME}s`);
    console.log(`   Tamanho do lote de registro: ${CONFIG.REGISTRATION_BATCH_SIZE}`);
    
    // Setup wallets
    const provider = hre.ethers.provider;
    const adminWallet = new hre.ethers.Wallet(CONFIG.ADMIN_PRIVATE_KEY, provider);
    const relayerWallet = new hre.ethers.Wallet(CONFIG.RELAYER_PRIVATE_KEY, provider);
    
    console.log(`\n🔑 Admin: ${adminWallet.address}`);
    console.log(`🔑 Relayer: ${relayerWallet.address}`);
    
    // Parâmetros ElGamal do public-config.json
    const elgamalParams = {
        p: BigInt("55165897703670560826798965179878233110247539804099651788833740589811541090679"),
        g: BigInt("46660909002153792544419617051490840116592764309940414679406448559943740671417"),
        h: BigInt("17554745303297698767349376234016072990405091619223930074233838865280794201144")
    };
    
    // 1. Deploy do contrato
    const contract = await deployFreshContract(adminWallet, relayerWallet.address, elgamalParams);
    
    // 2. Gerar wallets dos eleitores
    console.log(`\n👥 Gerando ${CONFIG.NUM_VOTERS} carteiras de eleitores...`);
    const voters = [];
    for (let i = 0; i < CONFIG.NUM_VOTERS; i++) {
        const wallet = hre.ethers.Wallet.createRandom();
        voters.push({
            privateKey: wallet.privateKey,
            address: wallet.address
        });
    }
    console.log(`✅ ${voters.length} carteiras geradas`);
    
    // 3. Registrar eleitores (MODO OTIMIZADO)
    const registrationResults = await registerVotersFast(contract, adminWallet, voters);
    
    // 4. Submeter votos em rajada
    const votingResults = await submitVotesInBurst(contract, relayerWallet, voters, elgamalParams);
    
    // 5. Analisar resultados
    const analysis = analyzeResults(votingResults, registrationResults);
    
    // 6. Salvar resultados
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    const outputFile = path.join(CONFIG.OUTPUT_DIR, `benchmark-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    console.log(`\n💾 Resultados salvos em: ${outputFile}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("   BENCHMARK CONCLUÍDO");
    console.log("=".repeat(60));
}

// Executar
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Erro fatal:", error);
        process.exit(1);
    });