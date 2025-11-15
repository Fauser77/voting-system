// core/signature-utils.js
const { ethers } = require("ethers");

/**
 * Gera assinatura para os dados do voto
 * @param {Object} voteData - Dados do voto (c1_values, c2_values)
 * @param {string} privateKey - Chave privada do eleitor
 * @returns {string} Assinatura digital
 */
async function signVoteData(voteData, privateKey) {
    try {
        // Cria wallet com a chave privada
        const wallet = new ethers.Wallet(privateKey);
        
        // Cria o hash dos dados usando o mesmo método do contrato
        const messageHash = ethers.solidityPackedKeccak256(
            ["uint256[]", "uint256[]"],
            [voteData.c1_values, voteData.c2_values]
        );
        
        // Assina o hash como um array de bytes
        const messageBytes = ethers.toBeArray(messageHash);
        const signature = await wallet.signMessage(messageBytes);
        
        console.log("✅ Assinatura gerada com sucesso");
        return signature;
    } catch (error) {
        throw new Error(`Erro ao assinar dados: ${error.message}`);
    }
}

/**
 * Valida a chave privada
 * @param {string} privateKey - Chave privada a validar
 * @returns {Object} { valid: boolean, address: string, error: string }
 */
function validatePrivateKey(privateKey) {
    try {
        if (!privateKey || privateKey.length !== 66) {
            return { valid: false, error: "Chave privada deve ter 66 caracteres (0x + 64)" };
        }
        
        if (!privateKey.startsWith('0x')) {
            return { valid: false, error: "Chave privada deve começar com '0x'" };
        }
        
        const wallet = new ethers.Wallet(privateKey);
        return { 
            valid: true, 
            address: wallet.address,
            error: null 
        };
    } catch (error) {
        return { 
            valid: false, 
            error: `Chave privada inválida: ${error.message}` 
        };
    }
}

module.exports = {
    signVoteData,
    validatePrivateKey
};