import { ethers } from 'ethers';

/**
 * Utilitarios criptograficos para o frontend
 * IMPORTANTE: Geracao de chaves feita EXCLUSIVAMENTE no client-side
 */

/**
 * Gera um novo par de chaves Ethereum
 * @returns {Object} { privateKey, address }
 */
export function generateKeyPair() {
  try {
    // Gerar wallet aleatorio usando ethers.js
    const wallet = ethers.Wallet.createRandom();
    
    return {
      privateKey: wallet.privateKey,
      address: wallet.address,
    };
  } catch (error) {
    console.error('Erro ao gerar par de chaves:', error);
    throw new Error('Falha ao gerar chaves. Tente novamente.');
  }
}

/**
 * Valida formato de endereco Ethereum
 * @param {string} address - Endereco para validar
 * @returns {boolean}
 */
export function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Valida formato de chave privada
 * @param {string} privateKey - Chave privada para validar
 * @returns {boolean}
 */
export function isValidPrivateKey(privateKey) {
  try {
    // Tenta criar um wallet com a chave privada
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formata CPF para exibicao (XXX.XXX.XXX-XX)
 * @param {string} cpf - CPF sem formatacao
 * @returns {string}
 */
export function formatCPF(cpf) {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Remove formatacao do CPF
 * @param {string} cpf - CPF formatado
 * @returns {string}
 */
export function cleanCPF(cpf) {
  return cpf.replace(/\D/g, '');
}

/**
 * Trunca endereco Ethereum para exibicao
 * @param {string} address - Endereco completo
 * @param {number} chars - Numero de caracteres a mostrar em cada lado
 * @returns {string}
 */
export function truncateAddress(address, chars = 6) {
  if (!address || address.length < chars * 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Copia texto para area de transferencia
 * @param {string} text - Texto para copiar
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para ambientes nao seguros
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch {
        textArea.remove();
        return false;
      }
    }
  } catch {
    return false;
  }
}

export default {
  generateKeyPair,
  isValidAddress,
  isValidPrivateKey,
  formatCPF,
  cleanCPF,
  truncateAddress,
  copyToClipboard,
};