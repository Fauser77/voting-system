// elgamal-utils.js
// Funções utilitárias compartilhadas para ElGamal

const fs = require('fs');

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

module.exports = {
    loadElGamalParams,
    modPow,
    modInverse
};