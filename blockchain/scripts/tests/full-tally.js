/**
 * BENCHMARK DE APURAÇÃO COMPLETA - Fluxo Real
 * 
 * Testa o fluxo completo de apuração:
 * 1. Buscar votos da blockchain (RPC)
 * 2. Deserializar dados
 * 3. Agregação homomórfica
 * 4. Decriptação BSGS
 * 5. Geração de provas
 * 6. Verificação de provas
 * 
 * Identifica onde está o gargalo real do sistema
 */

const hre = require("hardhat");
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ==================== CONFIGURAÇÃO ====================

const CONFIG = {
    // Endereço do contrato (do benchmark anterior)
    CONTRACT_ADDRESS: '0x22f9Bdb93E73120DfFa5094D8bb6e1f6f6BD641e', // Será preenchido via argumento
    
    // Parâmetros ElGamal
    ELGAMAL: {
        p: BigInt("55165897703670560826798965179878233110247539804099651788833740589811541090679"),
        g: BigInt("46660909002153792544419617051490840116592764309940414679406448559943740671417"),
        h: BigInt("17554745303297698767349376234016072990405091619223930074233838865280794201144"),
        x: BigInt("2679379680584797737992027265103380387093466416477324300763694489056043485100")
    },
    
    // Arquivo de saída
    OUTPUT_DIR: './benchmark-results'
};

// ==================== FUNÇÕES CRIPTOGRÁFICAS ====================

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

function modInverse(a, m) {
    let m0 = m;
    let x0 = 0n;
    let x1 = 1n;
    
    if (m === 1n) return 0n;
    
    while (a > 1n) {
        let q = a / m;
        let t = m;
        m = a % m;
        a = t;
        t = x0;
        x0 = x1 - q * x0;
        x1 = t;
    }
    
    if (x1 < 0n) x1 += m0;
    return x1;
}

function generateRandom(p) {
    return BigInt('0x' + crypto.randomBytes(32).toString('hex')) % (p - 2n) + 1n;
}

// ==================== BABY-STEP GIANT-STEP ====================

function babyStepGiantStep(g, target, p, maxValue) {
    const m = BigInt(Math.ceil(Math.sqrt(Number(maxValue) + 1)));
    
    const table = new Map();
    let current = 1n;
    
    for (let i = 0n; i <= m; i++) {
        table.set(current.toString(), i);
        current = (current * g) % p;
    }
    
    const gInvM = modInverse(modPow(g, m, p), p);
    let gamma = target;
    
    for (let j = 0n; j <= m; j++) {
        if (table.has(gamma.toString())) {
            const i = table.get(gamma.toString());
            const result = j * m + i;
            if (result <= BigInt(maxValue)) {
                return result;
            }
        }
        gamma = (gamma * gInvM) % p;
    }
    
    return null;
}

// ==================== PROVAS CHAUM-PEDERSEN ====================

function generateDecryptionProof(c1, c2, decryptedValue, params) {
    const w = generateRandom(params.p);
    
    const a = modPow(params.g, w, params.p);
    const b = modPow(c1, w, params.p);
    
    const challengeInput = `${c1},${c2},${decryptedValue},${a},${b}`;
    const challengeHash = crypto.createHash('sha256').update(challengeInput).digest('hex');
    const e = BigInt('0x' + challengeHash) % (params.p - 1n);
    
    let s = (w + e * params.x) % (params.p - 1n);
    if (s < 0n) s = s + (params.p - 1n);
    
    return { a, b, e, s, decryptedValue };
}

function verifyDecryptionProof(c1, c2, proof, params) {
    const { a, b, e, s, decryptedValue } = proof;
    
    const left1 = modPow(params.g, s, params.p);
    const right1 = (a * modPow(params.h, e, params.p)) % params.p;
    
    if (left1 !== right1) return false;
    
    const left2 = modPow(c1, s, params.p);
    const c2_div_m = (c2 * modInverse(decryptedValue, params.p)) % params.p;
    const right2 = (b * modPow(c2_div_m, e, params.p)) % params.p;
    
    return left2 === right2;
}

// ==================== BENCHMARK FUNCTIONS ====================

async function benchmarkFetchVotes(contract) {
    console.log("\n📥 FASE 1: Buscar votos da blockchain");
    
    const metrics = {
        method: null,
        time: 0,
        votesCount: 0,
        bytesReceived: 0
    };
    
    // Método 1: getAllEncryptedVotes (uma chamada)
    console.log("  Tentando getAllEncryptedVotes()...");
    let startTime = Date.now();
    
    try {
        const allVotes = await contract.getAllEncryptedVotes();
        metrics.time = Date.now() - startTime;
        metrics.method = "getAllEncryptedVotes";
        metrics.votesCount = allVotes.length;
        
        // Estimar tamanho dos dados
        const sampleVote = allVotes[0];
        const bytesPerVote = sampleVote ? 
            (sampleVote.c1_values.length * 32 * 2) + 8 + 20 : 0; // c1 + c2 + timestamp + address
        metrics.bytesReceived = bytesPerVote * allVotes.length;
        
        console.log(`  ✅ Sucesso: ${allVotes.length} votos em ${metrics.time}ms`);
        console.log(`  📦 Dados estimados: ~${(metrics.bytesReceived / 1024).toFixed(2)} KB`);
        
        return { metrics, votes: allVotes };
        
    } catch (error) {
        console.log(`  ❌ Erro: ${error.message}`);
        console.log("  Tentando método alternativo (getVote individual)...");
        
        // Método 2: getVote individual (fallback)
        startTime = Date.now();
        const totalVotes = await contract.getTotalVotes();
        const votes = [];
        
        for (let i = 0; i < totalVotes; i++) {
            const vote = await contract.getVote(i);
            votes.push(vote);
            
            if ((i + 1) % 50 === 0) {
                process.stdout.write(`  Buscando: ${i + 1}/${totalVotes}\r`);
            }
        }
        
        metrics.time = Date.now() - startTime;
        metrics.method = "getVote (individual)";
        metrics.votesCount = votes.length;
        
        console.log(`\n  ✅ Sucesso: ${votes.length} votos em ${metrics.time}ms`);
        
        return { metrics, votes };
    }
}

function benchmarkDeserialize(rawVotes, numCandidates) {
    console.log("\n🔄 FASE 2: Deserializar dados");
    
    const startTime = Date.now();
    const votes = [];
    
    for (const rawVote of rawVotes) {
        const voteData = [];
        
        for (let i = 0; i < numCandidates; i++) {
            voteData.push({
                c1: BigInt(rawVote.c1_values[i].toString()),
                c2: BigInt(rawVote.c2_values[i].toString())
            });
        }
        
        votes.push(voteData);
    }
    
    const time = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${time}ms`);
    console.log(`  📊 Votos processados: ${votes.length}`);
    
    return { time, votes };
}

function benchmarkAggregation(votes, params, candidateNames) {
    console.log("\n🔢 FASE 3: Agregação homomórfica");
    
    const startTime = Date.now();
    const aggregated = [];
    
    for (let candidateIdx = 0; candidateIdx < candidateNames.length; candidateIdx++) {
        let c1_product = 1n;
        let c2_product = 1n;
        
        for (const vote of votes) {
            c1_product = (c1_product * vote[candidateIdx].c1) % params.p;
            c2_product = (c2_product * vote[candidateIdx].c2) % params.p;
        }
        
        aggregated.push({ 
            c1: c1_product, 
            c2: c2_product,
            candidate: candidateNames[candidateIdx]
        });
    }
    
    const time = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${time}ms`);
    console.log(`  📊 Operações: ${votes.length} × ${candidateNames.length} = ${votes.length * candidateNames.length} multiplicações modulares`);
    
    return { time, aggregated };
}

function benchmarkDecryption(aggregated, params, maxVoters) {
    console.log("\n🔓 FASE 4: Decriptação (BSGS)");
    
    const startTime = Date.now();
    const results = [];
    const bsgsTimes = [];
    
    for (const { c1, c2, candidate } of aggregated) {
        // Decifrar
        const decryptStart = Date.now();
        const c1_x = modPow(c1, params.x, params.p);
        const c1_x_inv = modInverse(c1_x, params.p);
        const m_prime = (c2 * c1_x_inv) % params.p;
        
        // BSGS
        const bsgsStart = Date.now();
        const voteCount = babyStepGiantStep(params.g, m_prime, params.p, maxVoters);
        const bsgsTime = Date.now() - bsgsStart;
        bsgsTimes.push(bsgsTime);
        
        results.push({
            candidate,
            votes: voteCount !== null ? Number(voteCount) : 0,
            m_prime,
            bsgsTime
        });
        
        console.log(`  ${candidate}: ${voteCount} votos (BSGS: ${bsgsTime}ms)`);
    }
    
    const time = Date.now() - startTime;
    const avgBsgsTime = bsgsTimes.reduce((a, b) => a + b, 0) / bsgsTimes.length;
    
    console.log(`  ⏱️  Tempo total: ${time}ms`);
    console.log(`  ⏱️  BSGS médio: ${avgBsgsTime.toFixed(2)}ms por candidato`);
    
    return { time, results, bsgsTimes };
}

function benchmarkProofGeneration(aggregated, params) {
    console.log("\n📜 FASE 5: Geração de provas Chaum-Pedersen");
    
    const startTime = Date.now();
    const proofs = [];
    
    for (const { c1, c2 } of aggregated) {
        const c1_x = modPow(c1, params.x, params.p);
        const c1_x_inv = modInverse(c1_x, params.p);
        const m_prime = (c2 * c1_x_inv) % params.p;
        
        const proof = generateDecryptionProof(c1, c2, m_prime, params);
        proofs.push({ c1, c2, proof });
    }
    
    const time = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${time}ms`);
    
    return { time, proofs };
}

function benchmarkProofVerification(proofData, params) {
    console.log("\n✅ FASE 6: Verificação de provas");
    
    const startTime = Date.now();
    let allValid = true;
    
    for (const { c1, c2, proof } of proofData) {
        const valid = verifyDecryptionProof(c1, c2, proof, params);
        if (!valid) allValid = false;
    }
    
    const time = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${time}ms`);
    console.log(`  ${allValid ? '✅' : '❌'} Resultado: ${allValid ? 'Todas válidas' : 'FALHA'}`);
    
    return { time, allValid };
}

// ==================== MAIN ====================

async function main() {
    console.log("=".repeat(60));
    console.log("   BENCHMARK DE APURAÇÃO COMPLETA - FLUXO REAL");
    console.log("=".repeat(60));
    
    // Pegar endereço do contrato via argumento
    const contractAddress = process.argv[2] || CONFIG.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
        console.error("\n❌ Erro: Endereço do contrato não fornecido");
        console.error("Uso: npx hardhat run script.js --network poa <CONTRACT_ADDRESS>");
        console.error("\nOu defina CONTRACT_ADDRESS no .env");
        process.exit(1);
    }
    
    console.log(`\n📋 Contrato: ${contractAddress}`);
    
    // Conectar ao contrato
    const Ballot = await hre.ethers.getContractFactory("Ballot");
    const contract = Ballot.attach(contractAddress);
    
    // Buscar informações básicas
    const candidateNames = [];
    const numCandidates = await contract.numCandidates();
    
    for (let i = 0; i < numCandidates; i++) {
        const [name] = await contract.getCandidate(i);
        candidateNames.push(name);
    }
    
    console.log(`👥 Candidatos: ${candidateNames.join(', ')}`);
    
    // Verificar fase
    const phase = await contract.phase();
    console.log(`📊 Fase atual: ${['Registration', 'Voting', 'Ended'][Number(phase)]}`);
    
    if (Number(phase) !== 2) {
        console.log("\n⚠️  Aviso: Contrato não está na fase 'Ended'");
        console.log("   O benchmark vai prosseguir, mas em produção a fase deveria ser 'Ended'");
    }
    
    const metrics = {
        timestamp: new Date().toISOString(),
        contractAddress,
        phases: {}
    };
    
    // ========== FASE 1: Buscar votos ==========
    const fetchResult = await benchmarkFetchVotes(contract);
    metrics.phases.fetch = fetchResult.metrics;
    
    if (fetchResult.metrics.votesCount === 0) {
        console.log("\n❌ Nenhum voto encontrado no contrato");
        process.exit(1);
    }
    
    const totalVotes = fetchResult.metrics.votesCount;
    
    // ========== FASE 2: Deserializar ==========
    const deserializeResult = benchmarkDeserialize(fetchResult.votes, Number(numCandidates));
    metrics.phases.deserialize = { time: deserializeResult.time };
    
    // ========== FASE 3: Agregação ==========
    const aggregationResult = benchmarkAggregation(
        deserializeResult.votes, 
        CONFIG.ELGAMAL, 
        candidateNames
    );
    metrics.phases.aggregation = { time: aggregationResult.time };
    
    // ========== FASE 4: Decriptação ==========
    const decryptionResult = benchmarkDecryption(
        aggregationResult.aggregated, 
        CONFIG.ELGAMAL, 
        totalVotes
    );
    metrics.phases.decryption = { 
        time: decryptionResult.time,
        bsgsTimes: decryptionResult.bsgsTimes
    };
    
    // ========== FASE 5: Geração de provas ==========
    const proofGenResult = benchmarkProofGeneration(
        aggregationResult.aggregated, 
        CONFIG.ELGAMAL
    );
    metrics.phases.proofGeneration = { time: proofGenResult.time };
    
    // ========== FASE 6: Verificação ==========
    const verifyResult = benchmarkProofVerification(proofGenResult.proofs, CONFIG.ELGAMAL);
    metrics.phases.proofVerification = { time: verifyResult.time, valid: verifyResult.allValid };
    
    // ========== RESUMO ==========
    console.log("\n" + "=".repeat(60));
    console.log("   RESUMO - ONDE ESTÁ O GARGALO?");
    console.log("=".repeat(60));
    
    const times = {
        'Buscar da blockchain': metrics.phases.fetch.time,
        'Deserializar': metrics.phases.deserialize.time,
        'Agregação homomórfica': metrics.phases.aggregation.time,
        'Decriptação (BSGS)': metrics.phases.decryption.time,
        'Geração de provas': metrics.phases.proofGeneration.time,
        'Verificação de provas': metrics.phases.proofVerification.time
    };
    
    const totalTime = Object.values(times).reduce((a, b) => a + b, 0);
    
    console.log(`\n📊 Total de votos: ${totalVotes}`);
    console.log(`⏱️  Tempo total: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)\n`);
    
    // Ordenar por tempo (maior primeiro)
    const sorted = Object.entries(times).sort((a, b) => b[1] - a[1]);
    
    console.log("┌────────────────────────────────┬──────────┬──────────┐");
    console.log("│ Fase                           │ Tempo    │ % Total  │");
    console.log("├────────────────────────────────┼──────────┼──────────┤");
    
    for (const [phase, time] of sorted) {
        const percentage = ((time / totalTime) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(percentage / 5));
        console.log(`│ ${phase.padEnd(30)} │ ${(time + 'ms').padStart(8)} │ ${(percentage + '%').padStart(7)} │ ${bar}`);
    }
    
    console.log("└────────────────────────────────┴──────────┴──────────┘");
    
    // Identificar gargalo
    const [bottleneck, bottleneckTime] = sorted[0];
    const bottleneckPercentage = ((bottleneckTime / totalTime) * 100).toFixed(1);
    
    console.log(`\n🎯 GARGALO IDENTIFICADO: ${bottleneck}`);
    console.log(`   Representa ${bottleneckPercentage}% do tempo total`);
    
    // Análise específica do gargalo
    if (bottleneck === 'Buscar da blockchain') {
        console.log("\n💡 ANÁLISE:");
        console.log("   O gargalo é a comunicação com a blockchain (RPC).");
        console.log("   Possíveis otimizações:");
        console.log("   - Usar eventos em vez de storage reads");
        console.log("   - Implementar paginação");
        console.log("   - Cache local dos votos");
        console.log("   - Nó RPC mais próximo/dedicado");
    } else if (bottleneck === 'Decriptação (BSGS)') {
        console.log("\n💡 ANÁLISE:");
        console.log("   O gargalo é o algoritmo Baby-step Giant-step.");
        console.log("   Complexidade atual: O(√n) por candidato");
        console.log("   Possíveis otimizações:");
        console.log("   - Pré-computar tabela de baby steps");
        console.log("   - Paralelizar decriptação entre candidatos");
        console.log("   - Usar curvas elípticas (ECC) em vez de grupos multiplicativos");
    } else if (bottleneck === 'Agregação homomórfica') {
        console.log("\n💡 ANÁLISE:");
        console.log("   O gargalo é a multiplicação modular durante agregação.");
        console.log("   Complexidade: O(n × k) onde n=votos, k=candidatos");
        console.log("   Possíveis otimizações:");
        console.log("   - Agregação parcial durante votação");
        console.log("   - Paralelizar por candidato");
    }
    
    // Resultados finais
    console.log("\n📊 RESULTADOS DA ELEIÇÃO:");
    for (const result of decryptionResult.results) {
        console.log(`   ${result.candidate}: ${result.votes} votos`);
    }
    
    // Salvar métricas
    metrics.totalTime = totalTime;
    metrics.bottleneck = { phase: bottleneck, time: bottleneckTime, percentage: bottleneckPercentage };
    metrics.results = decryptionResult.results.map(r => ({ candidate: r.candidate, votes: r.votes }));
    
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    const outputFile = path.join(CONFIG.OUTPUT_DIR, `benchmark-full-tally-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(metrics, null, 2));
    console.log(`\n💾 Métricas salvas em: ${outputFile}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("   BENCHMARK CONCLUÍDO");
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Erro fatal:", error);
        process.exit(1);
    });