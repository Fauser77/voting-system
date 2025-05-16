// deploy-poa.js
// Script para fazer deploy do contrato de votação na rede PoA
const hre = require("hardhat");

async function main() {
  console.log("=== Deploy do Contrato de Votação na Rede PoA ===");
  
  // Obter os signers
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0]; // Chairperson
  
  console.log(`Implantando contrato com a conta: ${deployer.address}`);
  console.log(`Saldo da conta: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
  console.log("-".repeat(50));

  // Array de nomes de candidatos para passar ao construtor
  const candidateNames = ["Paulo", "Maria", "João"];
  
  console.log(`Candidatos para esta votação: ${candidateNames.join(", ")}`);
  
  // Obter o ContractFactory para o contrato Ballot
  const Ballot = await hre.ethers.getContractFactory("Ballot");
  
  console.log("Iniciando deploy do contrato Ballot na rede PoA...");
  
  // Deploy do contrato com a lista de candidatos
  // Aqui adicionamos gasLimit maior para garantir que o deploy seja bem-sucedido
  const ballot = await Ballot.deploy(candidateNames, {
    gasLimit: 5000000 
  });
  
  // Aguardar a conclusão do deploy
  await ballot.waitForDeployment();
  
  // Obter o endereço do contrato implantado
  const ballotAddress = await ballot.getAddress();
  
  console.log(`Contrato Ballot implantado no endereço: ${ballotAddress}`);
  console.log("-".repeat(50));

  // === Verificação pós-deploy ===
  console.log("=== Verificação Inicial do Contrato ===");
  const chairPerson = await ballot.chairPerson();
  console.log(`ChairPerson: ${chairPerson}`);
  
  const numProposals = await ballot.getProposalCount();
  console.log(`Número de propostas registradas: ${numProposals.toString()}`);
  
  // Verificar cada candidato
  console.log("Lista de candidatos:");
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`  [${i}] ${candidate[0]} (${candidate[1]} votos)`);
  }
  
  console.log("\nDeploy do contrato concluído com sucesso na rede PoA!");
  console.log(`Endereço do contrato Ballot: ${ballotAddress}`);
  console.log("Salve este endereço para uso nas interações com o contrato.");
  
  // Salvar o endereço do contrato em um arquivo para referência futura
  const fs = require('fs');
  fs.writeFileSync('contract-address.txt', `Endereço do contrato Ballot na rede PoA: ${ballotAddress}\n`);
  console.log("Endereço do contrato salvo em 'contract-address.txt'");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro durante o deploy:");
    console.error(error);
    process.exit(1);
  });