// interact.js
// Script para interagir com o contrato Ballot
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("=== Interagindo com o contrato Ballot ===");
  
  // Carregar o endereço do contrato de um arquivo
  let contractAddress;
  try {
    const addressFile = fs.readFileSync('contract-address.txt', 'utf8');
    contractAddress = addressFile.split(':')[1].trim();
  } catch (error) {
    console.error("Erro ao ler o endereço do contrato do arquivo:");
    console.error("Certifique-se de que o deploy foi executado e que o arquivo contract-address.txt existe.");
    console.error("Alternativamente, forneça o endereço do contrato diretamente no script.");
    process.exit(1);
  }
  
  console.log(`Endereço do contrato: ${contractAddress}`);
  
  // Obter as contas
  const accounts = await hre.ethers.getSigners();
  const chairperson = accounts[0];
  const voters = accounts.slice(1, 5); // Eleitores 1-4
  
  console.log(`Chairperson: ${chairperson.address}`);
  console.log(`Eleitor 1: ${voters[0].address}`);
  console.log(`Eleitor 2: ${voters[1].address}`);
  console.log(`Eleitor 3: ${voters[2].address}`);
  console.log(`Eleitor 4: ${voters[3].address}`);
  console.log("-".repeat(50));
  
  // Conectar ao contrato
  const Ballot = await hre.ethers.getContractFactory("Ballot");
  const ballot = await Ballot.attach(contractAddress);
  
  // Verificar o estado inicial do contrato
  console.log("=== Estado Inicial ===");
  const chairPersonAddr = await ballot.chairPerson();
  console.log(`ChairPerson do contrato: ${chairPersonAddr}`);
  
  const numProposals = await ballot.getProposalCount();
  console.log(`Número de propostas: ${numProposals}`);
  
  // Listar candidatos
  console.log("\nLista de candidatos:");
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`  [${i}] ${candidate[0]} (${candidate[1]} votos)`);
  }
  console.log("-".repeat(50));
  
  // === 1. Dar direito de voto aos eleitores ===
  console.log("=== Concedendo Direitos de Voto ===");
  
  for (let i = 0; i < voters.length; i++) {
    const voterAddress = voters[i].address;
    console.log(`Verificando direito de voto para o Eleitor ${i+1}: ${voterAddress}`);
    
    // Verificar se já tem direito de voto
    const hasRight = await ballot.hasRightToVote(voterAddress);
    if (hasRight) {
      console.log(`  ✓ Eleitor ${i+1} já possui direito de voto`);
    } else {
      console.log(`  Dando direito de voto para o Eleitor ${i+1}`);
      
      try {
        // Chamar a função giveRightToVote como chairperson
        const tx = await ballot.connect(chairperson).giveRightToVote(voterAddress);
        await tx.wait(); // Aguardar a confirmação da transação
        
        // Verificar se o direito de voto foi concedido
        const hasRightNow = await ballot.hasRightToVote(voterAddress);
        console.log(`  ✓ Direito de voto concedido: ${hasRightNow}`);
      } catch (error) {
        console.error(`  ✗ Erro ao conceder direito de voto: ${error.message}`);
      }
    }
  }
  console.log("-".repeat(50));
  
  // === 2. Eleitores votam ===
  console.log("=== Registrando Votos ===");
  
  // Distribuição de votos
  const votingPlan = [
    // { voter: chairperson, choice: 0 }, // Opcional: chairperson também pode votar
    { voter: voters[0], choice: 0 }, // Eleitor 1 vota no candidato 0
    { voter: voters[1], choice: 1 }, // Eleitor 2 vota no candidato 1
    { voter: voters[2], choice: 2 }, // Eleitor 3 vota no candidato 2
    { voter: voters[3], choice: 0 }  // Eleitor 4 vota no candidato 0
  ];
  
  for (let i = 0; i < votingPlan.length; i++) {
    const { voter, choice } = votingPlan[i];
    const voterIndex = voters.indexOf(voter) + 1;
    
    try {
      // Obter informações do candidato
      const candidate = await ballot.getCandidate(choice);
      console.log(`Eleitor ${voterIndex} (${voter.address}) está votando no candidato: ${candidate[0]}`);
      
      // Chamar a função vote
      const tx = await ballot.connect(voter).vote(choice);
      await tx.wait(); // Aguardar a confirmação da transação
      
      console.log(`  ✓ Voto registrado com sucesso`);
    } catch (error) {
      console.error(`  ✗ Erro ao registrar voto: ${error.message}`);
    }
  }
  console.log("-".repeat(50));
  
  // === 3. Verificação dos resultados ===
  console.log("=== Resultados da Votação ===");
  
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
  
  console.log("Interação com o contrato concluída com sucesso!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro durante a interação com o contrato:");
    console.error(error);
    process.exit(1);
  });