// elgamal-utils.js
// Funções utilitárias compartilhadas para ElGamal

const fs = require('fs');
const crypto = require('crypto');

// Função para carregar parâmetros do arquivo
function loadElGamalParams() {
    const paramsFile = 'elgamal-params.json';
    
    if (!fs.existsSync(paramsFile)) {
        console.error("❌ Arquivo elgamal-params.json não encontrado!");
        console.log("   Execute primeiro: node scripts/elgamal-params-generator.js");
        process.exit(1);
    }
    
    const params = JSON.parse(fs.readFileSync(paramsFile, 'utf8'));
    
    // Converter strings para BigInt
    return {
        p: BigInt(params.p),
        g: BigInt(params.g),
        h: BigInt(params.h),
        x: BigInt(params.x),
        generated: params.generated,
        bits: params.bits
    };
}

// Função para exponenciação modular
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

// Função para inverso modular
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

function encryptVote(candidateIndex, numCandidates, publicKey) {
    // Cria vetor binário (0,0,...,1,...,0) onde 1 está na posição do candidato
    const voteArray = new Array(numCandidates).fill(0);
    voteArray[candidateIndex] = 1;
    
    const c1_values = [];
    const c2_values = [];
    
    for (let i = 0; i < voteArray.length; i++) {
        const m = BigInt(voteArray[i]);
        
        const r = generateRandom(publicKey.p);
        
        // C1 = G^R mod P
        const c1 = modPow(publicKey.g, r, publicKey.p);
        
        // C2 = H^R * G^M mod P
        const h_r = modPow(publicKey.h, r, publicKey.p);
        const g_m = modPow(publicKey.g, m, publicKey.p);
        const c2 = (h_r * g_m) % publicKey.p;
        
        c1_values.push(c1);
        c2_values.push(c2);
    }
    
    return { c1_values, c2_values };
}

function decryptValue(c1, c2, privateKey, publicKey) {
    // M = C2 * (C1^x)^-1 mod P
    const c1_x = modPow(c1, privateKey, publicKey.p);
    const c1_x_inv = modInverse(c1_x, publicKey.p);
    const m_recovered = (c2 * c1_x_inv) % publicKey.p;
    
    // Para votos binários, verificamos se é g^0 (=1) ou g^1 (=g)
    if (m_recovered === 1n) {
        return 0n;
    } else if (m_recovered === publicKey.g) {
        return 1n;
    } else {
        throw new Error("Valor decifrado inválido");
    }
}

function validateEncryptedVote(c1_values, c2_values, numCandidates) {
    // Verificações básicas
    if (!c1_values || !c2_values) {
        return { valid: false, error: "Valores cifrados ausentes" };
    }
    
    if (c1_values.length !== numCandidates || c2_values.length !== numCandidates) {
        return { valid: false, error: "Número incorreto de valores cifrados" };
    }
    
    // Verifica se todos são BigInt válidos e positivos
    for (let i = 0; i < numCandidates; i++) {
        try {
            if (typeof c1_values[i] !== 'bigint' || typeof c2_values[i] !== 'bigint') {
                return { valid: false, error: `Valor na posição ${i} não é BigInt` };
            }
            if (c1_values[i] <= 0n || c2_values[i] <= 0n) {
                return { valid: false, error: `Valor na posição ${i} não é positivo` };
            }
        } catch (e) {
            return { valid: false, error: `Erro ao validar posição ${i}: ${e.message}` };
        }
    }
    
    return { valid: true };
}

module.exports = {
    loadElGamalParams,
    modPow,
    modInverse,
    generateRandom,
    encryptVote,
    decryptValue,
    validateEncryptedVote
};