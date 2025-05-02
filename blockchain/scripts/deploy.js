const hre = require("hardhat");

async function main() {
  // Obter os signers (contas)
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Implantando contrato com a conta:", deployer.address);
  console.log("Saldo da conta:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Obter o ContractFactory para o contrato Ballot
  const Ballot = await hre.ethers.getContractFactory("Ballot");
  
  // Array de nomes de candidatos para passar ao construtor
  // Isso poderia ser parametrizado através de argumentos de linha de comando
  const candidateNames = process.env.CANDIDATES 
    ? process.env.CANDIDATES.split(',') 
    : ["Candidato 1", "Candidato 2"];
  
  console.log("Iniciando deploy do contrato Ballot...");
  console.log("Candidatos que serão registrados:", candidateNames.join(", "));
  
  // Deploy do contrato com a lista de candidatos
  const ballot = await Ballot.deploy(candidateNames);
  
  // Aguardar a conclusão do deploy
  await ballot.waitForDeployment();
  
  // Obter o endereço do contrato implantado
  const ballotAddress = await ballot.getAddress();
  
  console.log("Contrato Ballot implantado no endereço:", ballotAddress);
  
  // Verificação pós-deploy
  console.log("\nVerificando estado inicial do contrato:");
  const chairPerson = await ballot.chairPerson();
  console.log("ChairPerson:", chairPerson);
  
  const numProposals = await ballot.getProposalCount();
  console.log("Número de propostas registradas:", numProposals.toString());
  
  // Verificar cada candidato
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`Candidato ${i}: ${candidate[0]} (${candidate[1]} votos)`);
  }
  
  // Adicionar informações para verificação do contrato (se estiver em uma rede que suporte)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nPara verificar o contrato:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${ballotAddress} "${candidateNames.join('","')}"`);
  }
}

// Executar a função principal
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro durante o deploy:");
    console.error(error);
    process.exit(1);
  });