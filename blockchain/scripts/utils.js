// utils.js
// Funções de utilidade compartilhadas para todos os scripts
const fs = require('fs');
const { ethers } = require('hardhat');

/**
 * Lê o endereço do contrato de um arquivo
 * @returns {Promise<string>} Endereço do contrato
 */
async function getContractAddress() {
  try {
    const addressFile = fs.readFileSync('contract-address.txt', 'utf8');
    return addressFile.split(':')[1].trim();
  } catch (error) {
    console.error("Erro ao ler o endereço do contrato:");
    console.error("Certifique-se de que o deploy foi executado e que o arquivo contract-address.txt existe.");
    throw error;
  }
}

/**
 * Salva o endereço do contrato em um arquivo
 * @param {string} address - Endereço do contrato
 * @param {string} network - Nome da rede (ex: "PoA", "local")
 */
function saveContractAddress(address, network = "PoA") {
  fs.writeFileSync('contract-address.txt', `Endereço do contrato Ballot na rede ${network}: ${address}\n`);
  console.log(`Endereço do contrato salvo em 'contract-address.txt'`);
}

/**
 * Conecta ao contrato Ballot
 * @param {string} address - Endereço do contrato (opcional)
 * @returns {Promise<Contract>} Instância do contrato
 */
async function connectToBallot(address = null) {
  // Se o endereço não for fornecido, tentar ler do arquivo
  const contractAddress = address || await getContractAddress();
  
  // Conectar ao contrato
  const Ballot = await ethers.getContractFactory("Ballot");
  return await Ballot.attach(contractAddress);
}

/**
 * Exibe informações sobre o contrato de votação
 * @param {Contract} ballot - Instância do contrato
 */
async function displayBallotInfo(ballot) {
  console.log("=== Informações do Contrato ===");
  
  const chairPerson = await ballot.chairPerson();
  console.log(`ChairPerson: ${chairPerson}`);
  
  const numProposals = await ballot.getProposalCount();
  console.log(`Número de propostas: ${numProposals}`);
  
  // Listar candidatos
  console.log("\nLista de candidatos:");
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`  [${i}] ${candidate[0]} (${candidate[1]} votos)`);
  }
  
  return numProposals;
}

/**
 * Exibe os resultados da votação
 * @param {Contract} ballot - Instância do contrato
 */
async function displayResults(ballot) {
  const numProposals = await ballot.getProposalCount();
  
  console.log("=== Resultados da Votação ===");
  console.log("Contagem de votos por candidato:");
  
  // Calcular total de votos para percentuais
  let totalVotes = 0;
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    totalVotes += Number(candidate[1]);
  }
  
  // Mostrar resultados
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    const voteCount = Number(candidate[1]);
    const percentage = totalVotes > 0 ? ((voteCount * 100) / totalVotes).toFixed(1) : "0.0";
    
    console.log(`  [${i}] ${candidate[0]}: ${voteCount} votos (${percentage}%)`);
  }
  
  // Verificar o vencedor
  const winnerIndex = await ballot.winningProposal();
  const winnerName = await ballot.winnerName();
  
  console.log("\nResultado da eleição:");
  console.log(`Vencedor: ${winnerName} (índice ${winnerIndex})`);
}

module.exports = {
  getContractAddress,
  saveContractAddress,
  connectToBallot,
  displayBallotInfo,
  displayResults
};