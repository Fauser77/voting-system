const crypto = require('crypto');
const { modPow, modInverse } = require('./elgamal-crypto');

// ==================== PROTOCOLO CHAUM-PEDERSEN ====================

function generateDecryptionProof(c1, c2, decryptedValue, x, g, h, p) {
    if (!c1 || !c2 || !decryptedValue || !x || !g || !h || !p) {
        throw new Error('Parâmetros inválidos para geração de prova');
    }

    c1 = BigInt(c1);
    c2 = BigInt(c2);
    decryptedValue = BigInt(decryptedValue);
    x = BigInt(x);
    g = BigInt(g);
    h = BigInt(h);
    p = BigInt(p);
    
    const w = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % (p - 1n);
    
    const a = modPow(g, w, p);
    const b = modPow(c1, w, p);
    
    const challengeInput = `${c1},${c2},${decryptedValue},${a},${b}`;
    const challengeHash = crypto.createHash('sha256').update(challengeInput).digest('hex');
    const e = BigInt('0x' + challengeHash) % (p - 1n);
    
    let s = (w + e * x) % (p - 1n);
    if (s < 0n) {
        s = s + (p - 1n);
    }
    
    return {
        commitment_a: a.toString(),
        commitment_b: b.toString(),
        challenge: e.toString(),
        response: s.toString(),
        decrypted_value: decryptedValue.toString()
    };
}

function verifyDecryptionProof(c1, c2, proof, g, h, p) {
    try {
        if (!c1 || !c2 || !proof || !g || !h || !p) {
            return false;
        }
        
        c1 = BigInt(c1);
        c2 = BigInt(c2);
        g = BigInt(g);
        h = BigInt(h);
        p = BigInt(p);
        
        const a = BigInt(proof.commitment_a);
        const b = BigInt(proof.commitment_b);
        const e = BigInt(proof.challenge);
        const s = BigInt(proof.response);
        const m = BigInt(proof.decrypted_value);
        
        const challengeInput = `${c1},${c2},${m},${a},${b}`;
        const challengeHash = crypto.createHash('sha256').update(challengeInput).digest('hex');
        const e_verify = BigInt('0x' + challengeHash) % (p - 1n);
        
        if (e !== e_verify) {
            console.log("    ❌ Falha na verificação do desafio");
            return false;
        }
        
        // Verificação 1: g^s = a * h^e (mod p)
        const left1 = modPow(g, s, p);
        const right1 = (a * modPow(h, e, p)) % p;
        
        if (left1 !== right1) {
            console.log("    ❌ Falha na primeira equação de verificação");
            return false;
        }
        
        // Verificação 2: c1^s = b * (c2/m)^e (mod p)
        const left2 = modPow(c1, s, p);
        const c2_div_m = (c2 * modInverse(m, p)) % p;
        const right2 = (b * modPow(c2_div_m, e, p)) % p;
        
        if (left2 !== right2) {
            console.log("    ❌ Falha na segunda equação de verificação");
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error("    ❌ Erro na verificação da prova:", error.message);
        return false;
    }
}

module.exports = {
    generateDecryptionProof,
    verifyDecryptionProof
};