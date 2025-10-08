const crypto = require('crypto');
const { modPow, modInverse } = require('./elgamal-crypto');

// ==================== PROTOCOLO CHAUM-PEDERSEN ====================

function generateDecryptionProof(c1, c2, decryptedValue, x, g, h, p) {
    const w = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % (p - 1n);
    const a = modPow(g, w, p);
    const b = modPow(c1, w, p);
    
    const challengeInput = `${c1},${c2},${decryptedValue},${a},${b}`;
    const challengeHash = crypto.createHash('sha256').update(challengeInput).digest('hex');
    const e = BigInt('0x' + challengeHash) % (p - 1n);
    
    const s = (w + e * x) % (p - 1n);
    
    return {
        commitment_a: a.toString(),
        commitment_b: b.toString(),
        challenge: e.toString(),
        response: s.toString(),
        decrypted_value: decryptedValue.toString()
    };
}

function verifyDecryptionProof(c1, c2, proof, g, h, p) {
    const a = BigInt(proof.commitment_a);
    const b = BigInt(proof.commitment_b);
    const e = BigInt(proof.challenge);
    const s = BigInt(proof.response);
    const m = BigInt(proof.decrypted_value);
    
    const challengeInput = `${c1},${c2},${m},${a},${b}`;
    const challengeHash = crypto.createHash('sha256').update(challengeInput).digest('hex');
    const e_verify = BigInt('0x' + challengeHash) % (p - 1n);
    
    if (e !== e_verify) return false;
    
    const left1 = modPow(g, s, p);
    const right1 = (a * modPow(h, e, p)) % p;
    
    const left2 = modPow(c1, s, p);
    const c2_div_m = (c2 * modInverse(m, p)) % p;
    const right2 = (b * modPow(c2_div_m, e, p)) % p;
    
    return (left1 === right1) && (left2 === right2);
}

module.exports = {
    generateDecryptionProof,
    verifyDecryptionProof
};