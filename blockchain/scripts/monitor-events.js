// monitor-events.js
// Script para monitorar eventos emitidos pelo contrato Ballot
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("=== Monitorando Eventos do Contrato Ballot ===");
  
  // Carregar o endereço do contrato
  let contractAddress;
  try {
    const addressFile = fs.readFileSync('contract-address.txt', 'utf8');
    contractAddress = addressFile.split(':')[1].trim();
  } catch (error) {
    console.error("Erro ao ler o endereço do contrato:");
    console.error("Certifique-se de que o deploy foi executado e que o arquivo contract-address.txt existe.");
    process.exit(1);
  }
  
  console.log(`Endereço do contrato: ${contractAddress}`);
  
  // Conectar ao contrato
  const Ballot = await hre.ethers.getContractFactory("Ballot");
  const ballot = await Ballot.attach(contractAddress);
  
  console.log("Obtendo candidatos...");
  const numProposals = await ballot.getProposalCount();
  
  // Mapeamento de índices para nomes de candidatos (para uso nos eventos)
  const candidateNames = {};
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    candidateNames[i] = candidate[0];
  }
  
  console.log("Iniciando monitoramento de eventos de voto...");
  console.log("Pressione Ctrl+C para interromper o monitoramento.\n");
  
  // Obter o número do bloco atual para filtrar eventos a partir daqui
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log(`Monitorando eventos a partir do bloco ${currentBlock}`);
  
  // Definir filtro para o evento VoteCast
  const filter = ballot.filters.VoteCast();
  
  // Função para lidar com eventos
  const handleEvent = async (blockNumber, candidateName) => {
    console.log(`[${new Date().toLocaleTimeString()}] Novo voto detectado:`);
    console.log(`  Bloco: ${blockNumber}`);
    console.log(`  Candidato: ${candidateName}`);
    
    // Atualizar contagem de votos
    console.log("\nContagem atual de votos:");
    for (let i = 0; i < numProposals; i++) {
      const candidate = await ballot.getCandidate(i);
      console.log(`  [${i}] ${candidate[0]}: ${candidate[1]} votos`);
    }
    console.log("-".repeat(50));
  };
  
  // Ouvir eventos passados (desde o bloco atual)
  console.log("Buscando eventos passados...");
  const pastEvents = await ballot.queryFilter(filter, currentBlock);
  
  if (pastEvents.length > 0) {
    console.log(`Encontrados ${pastEvents.length} eventos de voto anteriores:`);
    for (const event of pastEvents) {
      await handleEvent(event.blockNumber, event.args.candidateName);
    }
  } else {
    console.log("Nenhum evento de voto encontrado anteriormente.");
  }
  
  // Ouvir eventos futuros
  console.log("Aguardando novos eventos...");
  ballot.on(filter, handleEvent);
  
  // Manter o script em execução
  process.stdin.resume();
}

main().catch((error) => {
  console.error("Erro durante o monitoramento de eventos:");
  console.error(error);
  process.exit(1);
});