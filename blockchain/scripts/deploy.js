const hre = require("hardhat");

async function main() {
  // Obter os signers (contas disponíveis no Ganache)
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0]; // Primeira conta será o chairperson
  
  console.log("=== Implantação do Contrato de Votação ===");
  console.log(`Implantando contrato com a conta: ${deployer.address}`);
  console.log(`Saldo da conta: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
  console.log("-".repeat(50));

  // Array de nomes de candidatos para passar ao construtor
  const candidateNames = ["Paulo", "Maria", "João"];
  
  console.log(`Candidatos para esta votação: ${candidateNames.join(", ")}`);
  
  // Obter o ContractFactory para o contrato Ballot
  const Ballot = await hre.ethers.getContractFactory("Ballot");
  
  console.log("Iniciando deploy do contrato Ballot...");
  // Deploy do contrato com a lista de candidatos
  const ballot = await Ballot.deploy(candidateNames);
  
  // Aguardar a conclusão do deploy
  await ballot.waitForDeployment();
  
  // Obter o endereço do contrato implantado
  const ballotAddress = await ballot.getAddress();
  
  console.log(`Contrato Ballot implantado no endereço: ${ballotAddress}`);
  console.log("-".repeat(50));

  // === Fase 1: Verificação pós-deploy ===
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
  console.log("-".repeat(50));

  // === Fase 2: Dar direito de voto a várias contas ===
  console.log("=== Concedendo Direitos de Voto ===");
  
  // Usaremos 5 das 10 contas do Ganache como eleitores
  const voters = accounts.slice(1, 6); // Contas 1-5 (índices 0-4)
  
  for (let i = 0; i < voters.length; i++) {
    const voterAddress = voters[i].address;
    console.log(`Dando direito de voto para o Eleitor ${i+1}: ${voterAddress}`);
    
    try {
      // Chamar a função giveRightToVote
      const tx = await ballot.giveRightToVote(voterAddress);
      await tx.wait(); // Aguardar a confirmação da transação
      
      // Verificar se o direito de voto foi concedido
      const hasRight = await ballot.hasRightToVote(voterAddress);
      console.log(`  ✓ Direito de voto concedido: ${hasRight}`);
    } catch (error) {
      console.error(`  ✗ Erro ao conceder direito de voto: ${error.message}`);
    }
  }
  console.log("-".repeat(50));

  // === Fase 3: Registrar votos ===
  console.log("=== Registrando Votos ===");
  
  // Distribuição de votos: tenta criar uma disputa interessante
  const votingPlan = [
    { voter: deployer, choice: 0 },  // chairperson vota no candidato 0
    { voter: voters[0], choice: 0 }, // Eleitor 1 vota no candidato 0
    { voter: voters[1], choice: 1 }, // Eleitor 2 vota no candidato 1
    { voter: voters[2], choice: 2 }, // Eleitor 3 vota no candidato 2
    { voter: voters[3], choice: 0 }, // Eleitor 4 vota no candidato 0
    { voter: voters[4], choice: 1 }  // Eleitor 5 vota no candidato 1
  ];
  
  for (let i = 0; i < votingPlan.length; i++) {
    const { voter, choice } = votingPlan[i];
    const voterName = voter === deployer ? "Chairperson" : `Eleitor ${accounts.indexOf(voter)}`;
    const candidate = await ballot.getCandidate(choice);
    
    console.log(`${voterName} (${voter.address}) está votando no candidato: ${candidate[0]}`);
    
    try {
      // Chamar a função vote 
      const tx = await ballot.connect(voter).vote(choice);
      await tx.wait(); // Aguardar a confirmação da transação
      console.log(`  ✓ Voto registrado com sucesso`);
      
      // Eventos são emitidos? Vamos verificar os logs da transação
      const receipt = await tx.getReceipt();
      console.log(`  ✓ Evento emitido no bloco: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`  ✗ Erro ao registrar voto: ${error.message}`);
    }
  }
  console.log("-".repeat(50));

  // === Fase 4: Tentar votação inválida ===
  console.log("=== Testando Casos de Erro ===");
  
  // Tentativa 1: Votar novamente (eleitores só podem votar uma vez)
  try {
    console.log("Tentando votar novamente com o mesmo eleitor...");
    await ballot.vote(1);
    console.log("  ✗ Erro esperado não ocorreu!");
  } catch (error) {
    console.log(`  ✓ Erro esperado: ${error.message}`);
  }
  
  // Tentativa 2: Votar sem direito (conta 6, que não recebeu direito)
  try {
    console.log(`Tentando votar com eleitor sem direito (${accounts[6].address})...`);
    await ballot.connect(accounts[6]).vote(0);
    console.log("  ✗ Erro esperado não ocorreu!");
  } catch (error) {
    console.log(`  ✓ Erro esperado: ${error.message}`);
  }
  
  // Tentativa 3: Votar em candidato inválido
  try {
    // Dar direito a um novo eleitor
    await ballot.giveRightToVote(accounts[7].address);
    
    console.log(`Tentando votar em candidato inválido...`);
    await ballot.connect(accounts[7]).vote(99);
    console.log("  ✗ Erro esperado não ocorreu!");
  } catch (error) {
    console.log(`  ✓ Erro esperado: ${error.message}`);
  }
  console.log("-".repeat(50));

  // === Fase 5: Verificação dos resultados ===
  console.log("=== Resultados da Votação ===");
  
  // Verificar resultados finais
  console.log("Contagem de votos por candidato:");
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`  [${i}] ${candidate[0]}: ${candidate[1]} votos`);
  }
  
  // Verificar o vencedor
  const winnerIndex = await ballot.winningProposal();
  const winnerName = await ballot.winnerName();
  
  console.log("\nResultado da eleição:");
  console.log(`Vencedor: ${winnerName} (índice ${winnerIndex})`);
  console.log("-".repeat(50));
  
  console.log("=== Detalhes Adicionais ===");
  console.log(`Número do bloco atual: ${await ethers.provider.getBlockNumber()}`);
  
  // Calcular o gás total usado
  console.log(`O contrato Ballot está pronto para uso em: ${ballotAddress}`);
}

// Executar a função principal
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro durante o deploy ou execução das transações:");
    console.error(error);
    process.exit(1);
  });