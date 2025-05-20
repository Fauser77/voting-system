// deploy.js
// Script unificado para deploy do contrato Ballot em qualquer rede
const hre = require("hardhat");
const { saveContractAddress, displayBallotInfo } = require('./utils');

/**
 * Deploy do contrato Ballot
 * @param {string[]} candidateNames - Nomes dos candidatos
 * @param {object} options - Opções de deploy (gasLimit, network, etc)
 * @returns {Promise<Contract>} Instância do contrato implantado
 */
async function deployContract(candidateNames, options = {}) {
  const { 
    gasLimit = 5000000,
    network = "local" 
  } = options;
  
  console.log(`=== Deploy do Contrato de Votação na Rede ${network} ===`);
  
  // Obter os signers
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0]; // Chairperson
  
  console.log(`Implantando contrato com a conta: ${deployer.address}`);
  console.log(`Saldo da conta: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
  console.log("-".repeat(50));
  
  console.log(`Candidatos para esta votação: ${candidateNames.join(", ")}`);
  
  // Obter o ContractFactory para o contrato Ballot
  const Ballot = await hre.ethers.getContractFactory("Ballot");
  
  console.log(`Iniciando deploy do contrato Ballot na rede ${network}...`);
  
  // Deploy do contrato com a lista de candidatos
  const ballot = await Ballot.deploy(candidateNames, { gasLimit });
  
  // Aguardar a conclusão do deploy
  await ballot.waitForDeployment();
  
  // Obter o endereço do contrato implantado
  const ballotAddress = await ballot.getAddress();
  
  console.log(`Contrato Ballot implantado no endereço: ${ballotAddress}`);
  console.log("-".repeat(50));
  
  // Salvar o endereço do contrato
  saveContractAddress(ballotAddress, network);
  
  return ballot;
}

/**
 * Função principal para deploy e verificação
 */
async function main() {
  try {
    // Verificar a rede atual
    const networkName = hre.network.name;
    const isPoA = networkName.includes('poa') || networkName.includes('geth');
    const networkType = isPoA ? "PoA" : "local";
    
    // Array de nomes de candidatos para passar ao construtor
    const candidateNames = ["Paulo", "Maria", "João"];
    
    // Deploy do contrato
    const ballot = await deployContract(candidateNames, { 
      network: networkType,
      // Aumentar o gasLimit para redes PoA
      gasLimit: isPoA ? 5000000 : 3000000 
    });
    
    // Verificação pós-deploy
    console.log("=== Verificação Inicial do Contrato ===");
    await displayBallotInfo(ballot);
    
    console.log("\nDeploy do contrato concluído com sucesso!");
    console.log(`Endereço do contrato Ballot: ${await ballot.getAddress()}`);
    console.log("Salve este endereço para uso nas interações com o contrato.");
  } catch (error) {
    console.error("Erro durante o deploy:");
    console.error(error);
    process.exit(1);
  }
}

// Exportar para uso em outros scripts
module.exports = {
  deployContract
};

// Executar como script principal se chamado diretamente
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Erro durante o deploy:");
      console.error(error);
      process.exit(1);
    });
}