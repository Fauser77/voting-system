/**
 * Implementação ElGamal para votação
 * Baseado no interact.js do blockchain
 */

/* global BigInt */

/**
 * Módulo exponenciação (BigInt)
 */
function modPow(base, exponent, modulus) {
  if (modulus === BigInt(1)) return BigInt(0);
  let result = BigInt(1);
  base = base % modulus;
  while (exponent > BigInt(0)) {
    if (exponent % BigInt(2) === BigInt(1)) {
      result = (result * base) % modulus;
    }
    exponent = exponent >> BigInt(1);
    base = (base * base) % modulus;
  }
  return result;
}

/**
 * Gera número aleatório seguro
 */
function getSecureRandom(max) {
  const array = new Uint32Array(8);
  window.crypto.getRandomValues(array);
  
  let randomBigInt = BigInt(0);
  for (let i = 0; i < array.length; i++) {
    randomBigInt = (randomBigInt << BigInt(32)) | BigInt(array[i]);
  }
  
  return (randomBigInt % (max - BigInt(1))) + BigInt(1);
}

/**
 * Cifra voto usando ElGamal
 * @param {number} candidateIndex - Índice do candidato escolhido
 * @param {number} numCandidates - Total de candidatos
 * @param {Object} params - { p, g, h }
 * @returns {Object} { c1_values, c2_values }
 */
export function encryptVote(candidateIndex, numCandidates, params) {
  const p = BigInt(params.p);
  const g = BigInt(params.g);
  const h = BigInt(params.h);
  
  const c1_values = [];
  const c2_values = [];
  
  for (let i = 0; i < numCandidates; i++) {
    const vote = (i === candidateIndex) ? BigInt(1) : BigInt(0);
    
    // Gerar 'r' aleatório para cada candidato
    const r = getSecureRandom(p - BigInt(1));
    
    // c1 = g^r mod p
    const c1 = modPow(g, r, p);
    
    // m_encoded = g^vote mod p
    const m_encoded = modPow(g, vote, p);
    
    // c2 = m_encoded * h^r mod p
    const c2 = (m_encoded * modPow(h, r, p)) % p;
    
    c1_values.push(c1.toString());
    c2_values.push(c2.toString());
  }
  
  return { c1_values, c2_values };
}

/**
 * Valida valores cifrados
 */
export function validateEncryptedVote(c1_values, c2_values, numCandidates, p) {
  const pBigInt = BigInt(p);
  
  if (c1_values.length !== numCandidates || c2_values.length !== numCandidates) {
    return {
      valid: false,
      error: 'Número incorreto de valores cifrados'
    };
  }
  
  for (let i = 0; i < numCandidates; i++) {
    const c1 = BigInt(c1_values[i]);
    const c2 = BigInt(c2_values[i]);
    
    if (c1 <= BigInt(0) || c1 >= pBigInt) {
      return {
        valid: false,
        error: `C1[${i}] fora do intervalo válido`
      };
    }
    
    if (c2 <= BigInt(0) || c2 >= pBigInt) {
      return {
        valid: false,
        error: `C2[${i}] fora do intervalo válido`
      };
    }
  }
  
  return { valid: true };
}

export default {
  encryptVote,
  validateEncryptedVote
};