/**
 * BENCHMARK DE APURAÇÃO - Sistema de Votação Blockchain
 * 
 * Objetivo: Medir tempo de processamento da apuração
 * - Agregação homomórfica (soma dos votos cifrados)
 * - Decriptação com Baby-step Giant-step
 * - Geração e verificação de provas Chaum-Pedersen
 * 
 * Simula diferentes cargas de votos para identificar o gargalo
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURAÇÃO ====================

const CONFIG = {
    // Parâmetros ElGamal (do seu sistema)
    ELGAMAL: {
        p: BigInt("55165897703670560826798965179878233110247539804099651788833740589811541090679"),
        g: BigInt("46660909002153792544419617051490840116592764309940414679406448559943740671417"),
        h: BigInt("17554745303297698767349376234016072990405091619223930074233838865280794201144"),
        x: BigInt("2679379680584797737992027265103380387093466416477324300763694489056043485100")
    },
    
    // Candidatos
    CANDIDATES: ["Maria Silva", "João Santos", "Ana Costa"],
    
    // Cenários de teste (quantidade de votos)
    TEST_SCENARIOS: [10, 50, 100, 200, 500, 1000],
    
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

// ==================== GERAÇÃO DE VOTOS SIMULADOS ====================

function generateSimulatedVotes(numVotes, numCandidates, params) {
    console.log(`  Gerando ${numVotes} votos simulados...`);
    
    const votes = [];
    const distribution = new Array(numCandidates).fill(0);
    
    for (let v = 0; v < numVotes; v++) {
        // Escolhe candidato aleatório
        const candidateIndex = Math.floor(Math.random() * numCandidates);
        distribution[candidateIndex]++;
        
        // Cria vetor binário cifrado
        const voteArray = new Array(numCandidates).fill(0);
        voteArray[candidateIndex] = 1;
        
        const encryptedVote = [];
        
        for (let i = 0; i < numCandidates; i++) {
            const m = BigInt(voteArray[i]);
            const r = generateRandom(params.p);
            
            const c1 = modPow(params.g, r, params.p);
            const h_r = modPow(params.h, r, params.p);
            const g_m = modPow(params.g, m, params.p);
            const c2 = (h_r * g_m) % params.p;
            
            encryptedVote.push({ c1, c2 });
        }
        
        votes.push(encryptedVote);
    }
    
    console.log(`  ✓ Distribuição esperada: ${distribution.join(', ')}`);
    
    return { votes, expectedDistribution: distribution };
}

// ==================== AGREGAÇÃO HOMOMÓRFICA ====================

function homomorphicAggregation(votes, params, candidateNames) {
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
    
    return aggregated;
}

// ==================== BABY-STEP GIANT-STEP ====================

function babyStepGiantStep(g, target, p, maxValue) {
    const m = BigInt(Math.ceil(Math.sqrt(Number(maxValue) + 1)));
    
    // Baby steps: computar g^0, g^1, ..., g^m
    const table = new Map();
    let current = 1n;
    
    for (let i = 0n; i <= m; i++) {
        table.set(current.toString(), i);
        current = (current * g) % p;
    }
    
    // Giant steps
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

// ==================== DECRIPTAÇÃO ====================

function decryptAggregatedResults(aggregated, params, maxVoters) {
    const results = [];
    
    for (const { c1, c2, candidate } of aggregated) {
        // Decifrar: M' = C2 * (C1^X)^-1 mod P
        const c1_x = modPow(c1, params.x, params.p);
        const c1_x_inv = modInverse(c1_x, params.p);
        const m_prime = (c2 * c1_x_inv) % params.p;
        
        // Decodificar usando BSGS
        const voteCount = babyStepGiantStep(params.g, m_prime, params.p, maxVoters);
        
        results.push({
            candidate,
            votes: voteCount !== null ? Number(voteCount) : 0,
            success: voteCount !== null
        });
    }
    
    return results;
}

// ==================== GERAÇÃO DE PROVA CHAUM-PEDERSEN ====================

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
    
    // Verificação 1: g^s = a * h^e (mod p)
    const left1 = modPow(params.g, s, params.p);
    const right1 = (a * modPow(params.h, e, params.p)) % params.p;
    
    if (left1 !== right1) return false;
    
    // Verificação 2: c1^s = b * (c2/m)^e (mod p)
    const left2 = modPow(c1, s, params.p);
    const c2_div_m = (c2 * modInverse(decryptedValue, params.p)) % params.p;
    const right2 = (b * modPow(c2_div_m, e, params.p)) % params.p;
    
    return left2 === right2;
}

// ==================== BENCHMARK COMPLETO ====================

function runTallyingBenchmark(numVotes, params, candidateNames) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  BENCHMARK: ${numVotes} votos`);
    console.log(`${"=".repeat(60)}`);
    
    const metrics = {
        numVotes,
        phases: {}
    };
    
    // Fase 1: Gerar votos simulados
    console.log("\n📝 FASE 1: Geração de votos");
    let startTime = Date.now();
    const { votes, expectedDistribution } = generateSimulatedVotes(numVotes, candidateNames.length, params);
    metrics.phases.voteGeneration = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${metrics.phases.voteGeneration}ms`);
    
    // Fase 2: Agregação homomórfica
    console.log("\n🔢 FASE 2: Agregação homomórfica");
    startTime = Date.now();
    const aggregated = homomorphicAggregation(votes, params, candidateNames);
    metrics.phases.aggregation = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${metrics.phases.aggregation}ms`);
    console.log(`  📊 Complexidade: O(n × k) = O(${numVotes} × ${candidateNames.length})`);
    
    // Fase 3: Decriptação com BSGS
    console.log("\n🔓 FASE 3: Decriptação (Baby-step Giant-step)");
    startTime = Date.now();
    const results = decryptAggregatedResults(aggregated, params, numVotes);
    metrics.phases.decryption = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${metrics.phases.decryption}ms`);
    console.log(`  📊 Complexidade: O(√n) = O(√${numVotes}) ≈ O(${Math.ceil(Math.sqrt(numVotes))})`);
    
    // Fase 4: Geração de provas
    console.log("\n📜 FASE 4: Geração de provas Chaum-Pedersen");
    startTime = Date.now();
    const proofs = [];
    for (const agg of aggregated) {
        const c1_x = modPow(agg.c1, params.x, params.p);
        const c1_x_inv = modInverse(c1_x, params.p);
        const m_prime = (agg.c2 * c1_x_inv) % params.p;
        proofs.push(generateDecryptionProof(agg.c1, agg.c2, m_prime, params));
    }
    metrics.phases.proofGeneration = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${metrics.phases.proofGeneration}ms`);
    
    // Fase 5: Verificação de provas
    console.log("\n✅ FASE 5: Verificação de provas");
    startTime = Date.now();
    let allValid = true;
    for (let i = 0; i < aggregated.length; i++) {
        const valid = verifyDecryptionProof(aggregated[i].c1, aggregated[i].c2, proofs[i], params);
        if (!valid) allValid = false;
    }
    metrics.phases.proofVerification = Date.now() - startTime;
    console.log(`  ⏱️  Tempo: ${metrics.phases.proofVerification}ms`);
    console.log(`  ${allValid ? '✅' : '❌'} Todas as provas: ${allValid ? 'Válidas' : 'INVÁLIDAS'}`);
    
    // Totais
    metrics.totalTime = Object.values(metrics.phases).reduce((a, b) => a + b, 0);
    metrics.tallyingTime = metrics.phases.aggregation + metrics.phases.decryption;
    
    // Resultados
    console.log("\n📊 RESULTADOS:");
    for (let i = 0; i < results.length; i++) {
        const expected = expectedDistribution[i];
        const actual = results[i].votes;
        const match = expected === actual ? '✅' : '❌';
        console.log(`  ${results[i].candidate}: ${actual} votos (esperado: ${expected}) ${match}`);
    }
    
    // Resumo de tempo
    console.log("\n⏱️  RESUMO DE TEMPO:");
    console.log(`  Geração de votos:    ${metrics.phases.voteGeneration}ms`);
    console.log(`  Agregação:           ${metrics.phases.aggregation}ms`);
    console.log(`  Decriptação (BSGS):  ${metrics.phases.decryption}ms`);
    console.log(`  Geração de provas:   ${metrics.phases.proofGeneration}ms`);
    console.log(`  Verificação:         ${metrics.phases.proofVerification}ms`);
    console.log(`  ─────────────────────────────`);
    console.log(`  TOTAL:               ${metrics.totalTime}ms`);
    console.log(`  Apuração real:       ${metrics.tallyingTime}ms (agregação + decriptação)`);
    
    return metrics;
}

// ==================== MAIN ====================

async function main() {
    console.log("=".repeat(60));
    console.log("   BENCHMARK DE APURAÇÃO - BABY-STEP GIANT-STEP");
    console.log("=".repeat(60));
    console.log(`\n⚙️  Configuração:`);
    console.log(`   Candidatos: ${CONFIG.CANDIDATES.join(', ')}`);
    console.log(`   Cenários: ${CONFIG.TEST_SCENARIOS.join(', ')} votos`);
    console.log(`   Parâmetros ElGamal: 256 bits`);
    
    const allResults = [];
    
    // Rodar benchmark para cada cenário
    for (const numVotes of CONFIG.TEST_SCENARIOS) {
        const metrics = runTallyingBenchmark(numVotes, CONFIG.ELGAMAL, CONFIG.CANDIDATES);
        allResults.push(metrics);
    }
    
    // Análise comparativa
    console.log("\n" + "=".repeat(60));
    console.log("   ANÁLISE COMPARATIVA");
    console.log("=".repeat(60));
    
    console.log("\n📈 TEMPO POR FASE (ms):");
    console.log("┌─────────┬───────────┬───────────┬───────────┬───────────┬───────────┐");
    console.log("│  Votos  │  Agregação│ Decript.  │  Provas   │  Verific. │   TOTAL   │");
    console.log("├─────────┼───────────┼───────────┼───────────┼───────────┼───────────┤");
    
    for (const r of allResults) {
        console.log(`│ ${r.numVotes.toString().padStart(7)} │ ${r.phases.aggregation.toString().padStart(9)} │ ${r.phases.decryption.toString().padStart(9)} │ ${r.phases.proofGeneration.toString().padStart(9)} │ ${r.phases.proofVerification.toString().padStart(9)} │ ${r.totalTime.toString().padStart(9)} │`);
    }
    console.log("└─────────┴───────────┴───────────┴───────────┴───────────┴───────────┘");
    
    // Análise de crescimento
    console.log("\n📊 ANÁLISE DE CRESCIMENTO:");
    console.log("\nAgregação Homomórfica - O(n):");
    for (let i = 1; i < allResults.length; i++) {
        const prev = allResults[i - 1];
        const curr = allResults[i];
        const voteRatio = curr.numVotes / prev.numVotes;
        const timeRatio = curr.phases.aggregation / prev.phases.aggregation;
        console.log(`  ${prev.numVotes} → ${curr.numVotes} votos: tempo cresceu ${timeRatio.toFixed(2)}x (esperado ~${voteRatio.toFixed(1)}x)`);
    }
    
    console.log("\nDecriptação BSGS - O(√n):");
    for (let i = 1; i < allResults.length; i++) {
        const prev = allResults[i - 1];
        const curr = allResults[i];
        const sqrtRatio = Math.sqrt(curr.numVotes) / Math.sqrt(prev.numVotes);
        const timeRatio = curr.phases.decryption / Math.max(prev.phases.decryption, 1);
        console.log(`  ${prev.numVotes} → ${curr.numVotes} votos: tempo cresceu ${timeRatio.toFixed(2)}x (esperado ~${sqrtRatio.toFixed(2)}x)`);
    }
    
    // Projeções
    console.log("\n🔮 PROJEÇÕES:");
    const lastResult = allResults[allResults.length - 1];
    const projections = [5000, 10000, 50000, 100000];
    
    for (const target of projections) {
        // Agregação: linear
        const aggProjected = (lastResult.phases.aggregation / lastResult.numVotes) * target;
        // BSGS: sqrt
        const bsgsProjected = lastResult.phases.decryption * Math.sqrt(target / lastResult.numVotes);
        const totalProjected = aggProjected + bsgsProjected;
        
        console.log(`  ${target.toLocaleString()} votos: ~${(totalProjected / 1000).toFixed(1)}s (agregação: ${(aggProjected / 1000).toFixed(1)}s, BSGS: ${(bsgsProjected / 1000).toFixed(1)}s)`);
    }
    
    // Salvar resultados
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    const outputData = {
        timestamp: new Date().toISOString(),
        config: {
            candidates: CONFIG.CANDIDATES,
            elgamalBits: 256,
            scenarios: CONFIG.TEST_SCENARIOS
        },
        results: allResults,
        projections: projections.map(target => ({
            votes: target,
            estimatedTimeMs: Math.round(
                (lastResult.phases.aggregation / lastResult.numVotes) * target +
                lastResult.phases.decryption * Math.sqrt(target / lastResult.numVotes)
            )
        }))
    };
    
    const outputFile = path.join(CONFIG.OUTPUT_DIR, `benchmark-tallying-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
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