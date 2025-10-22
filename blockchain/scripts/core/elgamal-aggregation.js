const { modPow, modInverse } = require('./elgamal-crypto');
const { generateDecryptionProof, verifyDecryptionProof } = require('./elgamal-proof');

// ==================== FUNÇÕES DE AGREGAÇÃO HOMOMÓRFICA ====================

async function homomorphicAggregation(votes, elgamalParams, candidateNames) {
    console.log("\n🔢 Realizando agregação homomórfica...");
    
    const p = elgamalParams.p;
    const aggregated = [];
    
    // Agregar votos para cada candidato usando propriedades homomórficas
    for (let candidateIdx = 0; candidateIdx < candidateNames.length; candidateIdx++) {
        let c1_product = 1n;
        let c2_product = 1n;
        
        // Multiplicar todos os votos cifrados para este candidato
        for (const vote of votes) {
            c1_product = (c1_product * vote[candidateIdx].c1) % p;
            c2_product = (c2_product * vote[candidateIdx].c2) % p;
        }
        
        aggregated.push({ 
            c1: c1_product, 
            c2: c2_product,
            candidate: candidateNames[candidateIdx]
        });
        
        console.log(`  ✓ Agregação completa para ${candidateNames[candidateIdx]}`);
    }
    
    console.log(`  📊 Total de ${votes.length} votos agregados homomorficamente`);
    
    return aggregated;
}

async function decryptAggregatedResults(aggregated, elgamalParams, maxVoters) {
     console.log("\n🔓 Decifrando resultados agregados (Método Helios)...");
    
    console.log(`  Máximo de eleitores autorizados: ${maxVoters}`);
    
    const maxVotersBigInt = BigInt(maxVoters);

    // Criar decoder estilo Helios
    const decoder = new HeliosDecoder(elgamalParams.g, elgamalParams.p);
    const results = [];
    
    for (let i = 0; i < aggregated.length; i++) {
        const { c1, c2, candidate } = aggregated[i];
        
        console.log(`\n  Processando ${candidate}:`);
        
        // Decifrar: M' = C2 * (C1^X)^-1 mod P
        console.log("    🔐 Calculando decifração ElGamal...");
        const c1_x = modPow(c1, elgamalParams.x, elgamalParams.p);
        const c1_x_inv = modInverse(c1_x, elgamalParams.p);
        const m_prime = (c2 * c1_x_inv) % elgamalParams.p;
        
        // Decodificar usando método Helios (eficiente para eleições grandes)
        console.log("    🔍 Decodificando contagem de votos...");
        const voteCount = decoder.decode(m_prime, maxVotersBigInt);
        
        if (voteCount === null) {
            console.log(`    ⚠️ AVISO: Não foi possível determinar contagem para ${candidate}`);
            console.log(`    Pode haver erro na decifração ou valor fora do esperado`);
        } else {
            console.log(`    ✓ Encontrado: ${voteCount} votos`);
        }
        
        // Gerar prova Chaum-Pedersen
        console.log("    🔏 Gerando prova Chaum-Pedersen...");
        const proof = generateDecryptionProof(
            c1, c2, m_prime,
            elgamalParams.x,
            elgamalParams.g,
            elgamalParams.h,
            elgamalParams.p
        );
        
        // Verificar prova
        const isValid = verifyDecryptionProof(
            c1, c2, proof,
            elgamalParams.g,
            elgamalParams.h,
            elgamalParams.p
        );
        
        console.log(`    ✅ Prova: ${isValid ? 'Válida' : 'Inválida'}`);
        
        results.push({
            candidate: candidate,
            votes: voteCount !== null ? voteCount : 0n,
            proofValid: isValid,
            proof: proof,
            decodingSuccess: voteCount !== null
        });
    }
    
    return results;
}

// ==================== DECODIFICAÇÃO ESTILO HELIOS ====================

// Algoritmo Baby-step Giant-step do Helios - O(√n) complexidade
function babyStepGiantStep(g, target, p, maxValue) {
    const maxValueBigInt = BigInt(maxValue);    
    const m = BigInt(Math.ceil(Math.sqrt(Number(maxValueBigInt))));
    
    // Baby steps: computar g^0, g^1, ..., g^m
    const table = new Map();
    let current = 1n;
    
    for(let i = 0n; i <= m; i++) {
        table.set(current.toString(), i);
        current = (current * g) % p;
    }
    
    // Giant steps: verificar target * (g^-m)^j para j = 0,1,2,...
    const gInvM = modInverse(modPow(g, m, p), p);
    let gamma = target;
    
    for(let j = 0n; j <= m; j++) {
        if (table.has(gamma.toString())) {
            const i = table.get(gamma.toString());
            const result = j * m + i;
            if (result <= maxValueBigInt) {
                return result;
            }
        }
        gamma = (gamma * gInvM) % p;
    }
    
    return null;
}

// Classe de decodificação estilo Helios com cache e otimizações
class HeliosDecoder {
    constructor(g, p) {
        this.g = BigInt(g);
        this.p = BigInt(p);
    }
    
    decode(target, maxValue) {
        console.log(`    🔄 Usando Baby-step Giant-step (máx: ${maxValue})...`);
        return babyStepGiantStep(this.g, BigInt(target), this.p, BigInt(maxValue));
    }
}

module.exports = {
    homomorphicAggregation,
    decryptAggregatedResults,
    babyStepGiantStep,
    HeliosDecoder
};