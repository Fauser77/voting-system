/* global BigInt */

import { ethers } from 'ethers';

/**
 * Assina dados do voto com chave privada
 * IMPORTANTE: Deve corresponder exatamente ao formato do contrato
 * @param {Object} voteData - { c1_values, c2_values }
 * @param {string} privateKey - Chave privada do eleitor
 * @returns {string} Assinatura
 */
export async function signVoteData(voteData, privateKey) {
  try {
    // Criar wallet a partir da chave privada
    const wallet = new ethers.Wallet(privateKey);
    
    // Preparar hash dos dados - IGUAL AO CONTRATO
    // O contrato usa: keccak256(abi.encodePacked(c1_values, c2_values))
    // Precisamos replicar exatamente isso
    
    // Converter arrays de strings para arrays de uint256
    const c1Array = voteData.c1_values.map(v => BigInt(v));
    const c2Array = voteData.c2_values.map(v => BigInt(v));
    
    // Criar o hash exatamente como o contrato faz
    // abi.encodePacked concatena os valores sem padding
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    // Encode como arrays de uint256
    const encodedData = abiCoder.encode(
      ['uint256[]', 'uint256[]'],
      [c1Array, c2Array]
    );
    
    // Fazer hash
    const messageHash = ethers.keccak256(encodedData);
    
    console.log('📝 Dados para assinatura:');
    console.log('  C1 values:', c1Array.length);
    console.log('  C2 values:', c2Array.length);
    console.log('  Hash dos dados:', messageHash);
    
    // Assinar o hash (com prefixo Ethereum)
    const messageBytes = ethers.getBytes(messageHash);
    const signature = await wallet.signMessage(messageBytes);
    
    console.log('✍️ Assinatura gerada:', signature);
    console.log('  Endereço do assinante:', wallet.address);
    
    return signature;
  } catch (error) {
    console.error('Erro ao assinar voto:', error);
    throw new Error(`Erro ao assinar voto: ${error.message}`);
  }
}

/**
 * Valida formato de chave privada
 */
export function validatePrivateKey(privateKey) {
  try {
    if (!privateKey || typeof privateKey !== 'string') {
      return {
        valid: false,
        error: 'Chave privada inválida'
      };
    }
    
    if (!privateKey.startsWith('0x')) {
      return {
        valid: false,
        error: 'Chave privada deve começar com 0x'
      };
    }
    
    if (privateKey.length !== 66) {
      return {
        valid: false,
        error: 'Chave privada deve ter 64 caracteres hexadecimais (66 com 0x)'
      };
    }
    
    // Tentar criar wallet
    const wallet = new ethers.Wallet(privateKey);
    
    return {
      valid: true,
      address: wallet.address
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Formato de chave privada inválido'
    };
  }
}

/**
 * Verifica se uma assinatura é válida
 * (útil para debug)
 */
export function verifySignature(voteData, signature, expectedAddress) {
  try {
    const c1Array = voteData.c1_values.map(v => BigInt(v));
    const c2Array = voteData.c2_values.map(v => BigInt(v));
    
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedData = abiCoder.encode(
      ['uint256[]', 'uint256[]'],
      [c1Array, c2Array]
    );
    
    const messageHash = ethers.keccak256(encodedData);
    const messageBytes = ethers.getBytes(messageHash);
    
    const recoveredAddress = ethers.verifyMessage(messageBytes, signature);
    
    return {
      valid: recoveredAddress.toLowerCase() === expectedAddress.toLowerCase(),
      recoveredAddress,
      expectedAddress
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

export default {
  signVoteData,
  validatePrivateKey,
  verifySignature
};