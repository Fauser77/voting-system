#!/usr/bin/env node
// vote-cli.js
// CLI interativa para o sistema de votação
const { ethers } = require('hardhat');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para prompt de perguntas
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Função para ler o endereço do contrato
async function getContractAddress() {
  try {
    const addressFile = fs.readFileSync('contract-address.txt', 'utf8');
    return addressFile.split(':')[1].trim();
  } catch (error) {
    console.error("Arquivo contract-address.txt não encontrado.");
    
    // Solicitar endereço manualmente
    const address = await prompt("Digite o endereço do contrato: ");
    return address.trim();
  }
}

// Função para exibir o menu principal
async function showMainMenu() {
  console.clear();
  console.log("=== Sistema de Votação Blockchain ===");
  console.log("1. Informações do Contrato");
  console.log("2. Dar Direito de Voto");
  console.log("3. Votar");
  console.log("4. Ver Resultados");
  console.log("5. Monitorar Eventos");
  console.log("0. Sair");
  console.log("-".repeat(40));
  
  const choice = await prompt("Escolha uma opção: ");
  return choice;
}

// Função para exibir informações do contrato
async function showContractInfo(ballot, accounts) {
  console.clear();
  console.log("=== Informações do Contrato ===");
  
  const chairPerson = await ballot.chairPerson();
  console.log(`ChairPerson: ${chairPerson}`);
  
  const numProposals = await ballot.getProposalCount();
  console.log(`\nNúmero de propostas: ${numProposals}`);
  
  console.log("\nLista de candidatos:");
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`  [${i}] ${candidate[0]} (${candidate[1]} votos)`);
  }
  
  console.log("\nContas disponíveis:");
  for (let i = 0; i < Math.min(accounts.length, 5); i++) {
    const addr = accounts[i].address;
    const hasRight = await ballot.hasRightToVote(addr);
    
    console.log(`  [${i}] ${addr}`);
    console.log(`      Direito de voto: ${hasRight ? '✓' : '✗'}`);
    
    // Verificar se já votou (se tiver direito)
    if (hasRight) {
      const voter = await ballot.voters(addr);
      console.log(`      Já votou: ${voter.isVoted ? '✓' : '✗'}`);
      if (voter.isVoted) {
        const candidate = await ballot.getCandidate(voter.vote);
        console.log(`      Votou em: ${candidate[0]}`);
      }
    }
  }
  
  console.log("-".repeat(40));
  await prompt("Pressione Enter para voltar ao menu principal...");
}

// Função para dar direito de voto
async function giveRightToVote(ballot, accounts) {
  console.clear();
  console.log("=== Dar Direito de Voto ===");
  
  // Garantir que estamos usando o chairperson
  const chairperson = accounts[0];
  console.log(`Executando como ChairPerson: ${chairperson.address}`);
  
  console.log("\nContas disponíveis:");
  for (let i = 1; i < Math.min(accounts.length, 10); i++) {
    const addr = accounts[i].address;
    const hasRight = await ballot.hasRightToVote(addr);
    
    console.log(`  [${i}] ${addr}`);
    console.log(`      Direito de voto: ${hasRight ? '✓' : '✗'}`);
  }
  
  const accountIndex = await prompt("\nDigite o número da conta para dar direito de voto (0 para voltar): ");
  if (accountIndex === '0') return;
  
  const index = parseInt(accountIndex);
  if (isNaN(index) || index < 1 || index >= accounts.length) {
    console.log("Índice inválido!");
    await prompt("Pressione Enter para continuar...");
    return;
  }
  
  const voterAddress = accounts[index].address;
  
  // Verificar se já tem direito de voto
  const hasRight = await ballot.hasRightToVote(voterAddress);
  if (hasRight) {
    console.log(`\nA conta ${voterAddress} já possui direito de voto.`);
    await prompt("Pressione Enter para continuar...");
    return;
  }
  
  console.log(`\nDando direito de voto para ${voterAddress}...`);
  
  try {
    const tx = await ballot.connect(chairperson).giveRightToVote(voterAddress);
    await tx.wait();
    
    console.log("✓ Direito de voto concedido com sucesso!");
  } catch (error) {
    console.error(`✗ Erro ao conceder direito de voto: ${error.message}`);
  }
  
  await prompt("Pressione Enter para continuar...");
}

// Função para votar
async function vote(ballot, accounts) {
  console.clear();
  console.log("=== Votar ===");
  
  console.log("Escolha a conta para votar:");
  for (let i = 0; i < Math.min(accounts.length, 10); i++) {
    const addr = accounts[i].address;
    const hasRight = await ballot.hasRightToVote(addr);
    const voter = await ballot.voters(addr);
    
    console.log(`  [${i}] ${addr}`);
    console.log(`      Direito de voto: ${hasRight ? '✓' : '✗'}`);
    console.log(`      Já votou: ${voter.isVoted ? '✓' : '✗'}`);
  }
  
  const accountIndex = await prompt("\nDigite o número da conta (0 para voltar): ");
  if (accountIndex === '0') return;
  
  const index = parseInt(accountIndex);
  if (isNaN(index) || index < 0 || index >= accounts.length) {
    console.log("Índice inválido!");
    await prompt("Pressione Enter para continuar...");
    return;
  }
  
  const voter = accounts[index];
  
  // Verificar se tem direito de voto
  const hasRight = await ballot.hasRightToVote(voter.address);
  if (!hasRight) {
    console.log(`\nA conta ${voter.address} não tem direito de voto.`);
    await prompt("Pressione Enter para continuar...");
    return;
  }
  
  // Verificar se já votou
  const voterInfo = await ballot.voters(voter.address);
  if (voterInfo.isVoted) {
    console.log(`\nA conta ${voter.address} já votou.`);
    await prompt("Pressione Enter para continuar...");
    return;
  }
  
  // Listar candidatos
  console.log("\nCandidatos disponíveis:");
  const numProposals = await ballot.getProposalCount();
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`  [${i}] ${candidate[0]} (${candidate[1]} votos)`);
  }
  
  const candidateIndex = await prompt("\nDigite o número do candidato para votar: ");
  const choice = parseInt(candidateIndex);
  
  if (isNaN(choice) || choice < 0 || choice >= numProposals) {
    console.log("Índice de candidato inválido!");
    await prompt("Pressione Enter para continuar...");
    return;
  }
  
  console.log(`\nVotando no candidato ${choice}...`);
  
  try {
    const tx = await ballot.connect(voter).vote(choice);
    await tx.wait();
    
    console.log("✓ Voto registrado com sucesso!");
  } catch (error) {
    console.error(`✗ Erro ao registrar voto: ${error.message}`);
  }
  
  await prompt("Pressione Enter para continuar...");
}

// Função para mostrar resultados
async function showResults(ballot) {
  console.clear();
  console.log("=== Resultados da Votação ===");
  
  const numProposals = await ballot.getProposalCount();
  
  console.log("Contagem de votos por candidato:");
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    const votePercentage = calculatePercentage(candidate[1], await getTotalVotes(ballot, numProposals));
    
    console.log(`  [${i}] ${candidate[0]}: ${candidate[1]} votos (${votePercentage}%)`);
  }
  
  // Verificar o vencedor
  const winnerIndex = await ballot.winningProposal();
  const winnerName = await ballot.winnerName();
  
  console.log("\nResultado da eleição:");
  console.log(`Vencedor: ${winnerName} (índice ${winnerIndex})`);
  
  await prompt("\nPressione Enter para voltar ao menu principal...");
}

// Função para calcular porcentagem
function calculatePercentage(votes, total) {
  if (total === 0) return "0.0";
  return ((votes * 100) / total).toFixed(1);
}

// Função para obter total de votos
async function getTotalVotes(ballot, numProposals) {
  let total = 0;
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    total += candidate[1];
  }
  return total;
}

// Função para monitorar eventos
async function monitorEvents(ballot) {
  console.clear();
  console.log("=== Monitoramento de Eventos ===");
  console.log("Aguardando novos votos... (pressione Ctrl+C para sair)");
  
  const numProposals = await ballot.getProposalCount();
  
  // Mapeamento de índices para nomes de candidatos
  const candidateNames = {};
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    candidateNames[i] = candidate[0];
  }
  
  // Definir filtro para o evento VoteCast
  const filter = ballot.filters.VoteCast();
  
  // Função para lidar com eventos
  const handleEvent = async (blockNumber, candidateName) => {
    console.log(`\n[${new Date().toLocaleTimeString()}] Novo voto detectado:`);
    console.log(`  Bloco: ${blockNumber}`);
    console.log(`  Candidato: ${candidateName}`);
    
    // Atualizar contagem de votos
    console.log("\nContagem atual de votos:");
    for (let i = 0; i < numProposals; i++) {
      const candidate = await ballot.getCandidate(i);
      const votePercentage = calculatePercentage(candidate[1], await getTotalVotes(ballot, numProposals));
      console.log(`  [${i}] ${candidate[0]}: ${candidate[1]} votos (${votePercentage}%)`);
    }
    console.log("-".repeat(50));
  };
  
  // Ouvir eventos
  ballot.on(filter, handleEvent);
  
  // Manter o monitoramento ativo até o usuário pressionar uma tecla
  await prompt("\nPressione Enter para voltar ao menu principal...");
  
  // Remover listener quando o usuário sair
  ballot.off(filter, handleEvent);
}

// Função principal
async function main() {
  try {
    console.log("Conectando ao contrato Ballot...");
    
    // Obter o endereço do contrato
    const contractAddress = await getContractAddress();
    
    // Obter as contas
    const accounts = await ethers.getSigners();
    
    // Conectar ao contrato
    const Ballot = await ethers.getContractFactory("Ballot");
    const ballot = await Ballot.attach(contractAddress);
    
    let running = true;
    
    while (running) {
      const choice = await showMainMenu();
      
      switch (choice) {
        case '1':
          await showContractInfo(ballot, accounts);
          break;
        case '2':
          await giveRightToVote(ballot, accounts);
          break;
        case '3':
          await vote(ballot, accounts);
          break;
        case '4':
          await showResults(ballot);
          break;
        case '5':
          await monitorEvents(ballot);
          break;
        case '0':
          running = false;
          break;
        default:
          console.log("Opção inválida!");
          await prompt("Pressione Enter para continuar...");
      }
    }
    
    console.log("Saindo do sistema de votação...");
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("Erro durante a execução do CLI:");
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

// Executar função principal
main();