#!/usr/bin/env node
// vote-cli.js
// CLI interativa aprimorada para o sistema de votação
const { ethers } = require('hardhat');
const readline = require('readline');
const { 
  connectToBallot, 
  displayBallotInfo, 
  displayResults 
} = require('./utils');
const { 
  giveRightToVote, 
  vote, 
  setupVoteMonitoring, 
  findVotingBlocks 
} = require('./interact');

// Configurar interface de linha de comando
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

// Função para exibir o menu principal
async function showMainMenu() {
  console.clear();
  console.log("=== Sistema de Votação Blockchain ===");
  console.log("1. Informações do Contrato");
  console.log("2. Dar Direito de Voto");
  console.log("3. Votar");
  console.log("4. Ver Resultados");
  console.log("5. Monitorar Eventos");
  console.log("6. Explorar Blocos de Votação");
  console.log("0. Sair");
  console.log("-".repeat(40));
  
  const choice = await prompt("Escolha uma opção: ");
  return choice;
}

// Função para exibir informações do contrato
async function showContractInfo(ballot, accounts) {
  console.clear();
  
  // Mostrar informações básicas do contrato
  await displayBallotInfo(ballot);
  
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

// Função para o menu de dar direito de voto
async function giveRightToVoteMenu(ballot, accounts) {
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
  await giveRightToVote(ballot, chairperson, voterAddress);
  
  await prompt("Pressione Enter para continuar...");
}

// Função para o menu de votação
async function voteMenu(ballot, accounts) {
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
  
  const accountIndex = await prompt("\nDigite o número da conta (9 para voltar): ");
  if (accountIndex === '9') return;
  
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
  
  await vote(ballot, voter, choice);
  
  await prompt("Pressione Enter para continuar...");
}

// Função para mostrar resultados da votação
async function showResultsMenu(ballot) {
  console.clear();
  
  // Chamar função de utilitário para exibir resultados
  await displayResults(ballot);
  
  await prompt("\nPressione Enter para voltar ao menu principal...");
}

// Função para monitorar eventos
async function monitorEventsMenu(ballot) {
  console.clear();
  console.log("=== Monitoramento de Eventos ===");
  console.log("Aguardando novos votos... (pressione Enter para voltar ao menu principal)");
  
  // Configurar o monitoramento de eventos
  const stopMonitoring = setupVoteMonitoring(ballot);
  
  // Esperar até o usuário pressionar Enter
  await prompt("");
  
  // Parar o monitoramento
  stopMonitoring();
}

// Função para explorar blocos de votação
async function exploreBlocksMenu(ballot) {
  console.clear();
  console.log("=== Explorar Blocos de Votação ===");
  
  // Obter endereço do contrato
  const contractAddress = await ballot.getAddress();
  
  console.log(`\nBuscando blocos para o contrato: ${contractAddress}`);
  
  // Versão melhorada de findVotingBlocks implementada diretamente
  async function findVotingBlocksImproved(contractAddress) {
    console.log(`Buscando transações para o contrato: ${contractAddress}\n`);
    
    // Conectar ao provider
    const provider = ethers.provider;
    
    // Obter o número do bloco atual
    const currentBlock = await provider.getBlockNumber();
    console.log(`Bloco atual: ${currentBlock}`);
    
    // Definir intervalo de blocos para busca
    const startBlock = Math.max(1, currentBlock - 1000); // Buscar nos últimos 1000 blocos
    console.log(`Buscando do bloco ${startBlock} até ${currentBlock}`);
    
    // Armazenar informações sobre blocos contendo transações do contrato
    const votingBlocks = [];
    
    console.log("\nBuscando blocos com transações do contrato de votação...");
    console.log("(Este processo pode levar algum tempo. Por favor, aguarde.)\n");
    
    // Tentar duas abordagens:
    
    // 1. Primeiro, tentar buscar eventos VoteCast emitidos pelo contrato (mais eficiente)
    console.log("\nBuscando eventos de voto...");
    try {
      // Definir filtro para o evento VoteCast
      const filter = ballot.filters.VoteCast();
      
      // Buscar eventos passados
      const voteEvents = await ballot.queryFilter(filter, startBlock, currentBlock);
      
      if (voteEvents.length > 0) {
        console.log(`\nEncontrados ${voteEvents.length} eventos de voto!`);
        
        // Processar cada evento
        for (const event of voteEvents) {
          // Obter a transação completa para identificar o remetente
          const tx = await provider.getTransaction(event.transactionHash);
          const block = await provider.getBlock(event.blockNumber);
          
          // Verificar se já temos este bloco na lista
          const existingBlock = votingBlocks.find(b => b.blockNumber === event.blockNumber);
          
          if (existingBlock) {
            // Adicionar a transação se ainda não estiver na lista
            const txExists = existingBlock.transactions.some(t => t.hash === event.transactionHash);
            if (!txExists) {
              existingBlock.transactions.push({
                hash: event.transactionHash,
                from: tx ? tx.from : "desconhecido",  // Usar o remetente da transação
                type: "vote",
                candidateName: event.args ? event.args.candidateName : "desconhecido"
              });
            }
          } else {
            // Adicionar novo bloco
            votingBlocks.push({
              blockNumber: event.blockNumber,
              timestamp: block.timestamp,
              transactions: [{
                hash: event.transactionHash,
                from: tx ? tx.from : "desconhecido",  // Usar o remetente da transação
                type: "vote",
                candidateName: event.args ? event.args.candidateName : "desconhecido"
              }]
            });
          }
        }
      } else {
        console.log("Nenhum evento de voto encontrado. Tentando método alternativo...");
      }
    } catch (error) {
      console.error(`\nErro ao buscar eventos: ${error.message}`);
      console.log("Continuando com o método de busca por transações...");
    }
    
    // 2. Se não encontramos eventos ou houve erro, tentar buscar por transações
    if (votingBlocks.length === 0) {
      console.log("\nBuscando por transações relacionadas ao contrato...");
      
      for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber++) {
        // Mostrar progresso a cada 20 blocos
        if (blockNumber % 20 === 0) {
          process.stdout.write(`\rVerificando blocos... ${Math.floor(((blockNumber - startBlock) / (currentBlock - startBlock)) * 100)}% completo (${blockNumber}/${currentBlock})`);
        }
        
        try {
          const block = await provider.getBlock(blockNumber, true);
          
          if (block && block.transactions && block.transactions.length > 0) {
            // Array para armazenar transações relacionadas ao contrato
            let contractRelatedTxs = [];
            
            // Verificar cada transação no bloco
            for (const tx of block.transactions) {
              // Verificar transações PARA o contrato
              if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
                // Obter o recibo da transação para verificar logs
                const receipt = await provider.getTransactionReceipt(tx.hash);
                
                // Verificar se a transação gerou logs (eventos) do contrato
                const isVoteTransaction = receipt && receipt.logs && receipt.logs.length > 0;
                
                if (isVoteTransaction) {
                  contractRelatedTxs.push({
                    hash: tx.hash,
                    from: tx.from,  // Usar o remetente da transação
                    type: "vote",
                    gasUsed: receipt.gasUsed.toString()
                  });
                  
                  console.log(`\n✅ Encontrada possível transação de VOTO!`);
                  console.log(`   Bloco: ${blockNumber}`);
                  console.log(`   Hash: ${tx.hash}`);
                  console.log(`   De: ${tx.from}`);
                } else {
                  contractRelatedTxs.push({
                    hash: tx.hash,
                    from: tx.from,
                    type: "interaction",
                    gasUsed: receipt ? receipt.gasUsed.toString() : "desconhecido"
                  });
                }
              } 
              // Verificar transações de DEPLOY do contrato
              else if (!tx.to) {
                try {
                  // Obter o recibo para verificar se criou um contrato
                  const receipt = await provider.getTransactionReceipt(tx.hash);
                  
                  // Se o recibo tem um contractAddress e corresponde ao nosso contrato
                  if (receipt && receipt.contractAddress && 
                      receipt.contractAddress.toLowerCase() === contractAddress.toLowerCase()) {
                    contractRelatedTxs.push({
                      hash: tx.hash,
                      from: tx.from,
                      type: "deploy",
                      gasUsed: receipt.gasUsed.toString()
                    });
                    console.log(`\n✅ Encontrada transação de DEPLOY do contrato!`);
                    console.log(`   Bloco: ${blockNumber}`);
                    console.log(`   Hash: ${tx.hash}`);
                    console.log(`   De: ${tx.from}`);
                  }
                } catch (error) {
                  // Ignorar erros ao verificar recibos
                }
              }
            }
            
            // Se encontramos transações relacionadas ao contrato neste bloco
            if (contractRelatedTxs.length > 0) {
              votingBlocks.push({
                blockNumber: blockNumber,
                timestamp: block.timestamp,
                transactions: contractRelatedTxs
              });
            }
          }
        } catch (error) {
          // Ignorar erros de bloco
        }
      }
      
      process.stdout.write(`\rVerificando blocos... 100% completo (${currentBlock}/${currentBlock})\n\n`);
    }
    
    return votingBlocks;
  }
  
  // Usar a versão melhorada em vez da versão antiga
  const votingBlocks = await findVotingBlocksImproved(contractAddress);
  
  console.log(`Total de blocos encontrados com transações do contrato: ${votingBlocks.length}`);
  
  if (votingBlocks.length > 0) {
    // Ordenar blocos por número (do mais recente para o mais antigo)
    votingBlocks.sort((a, b) => b.blockNumber - a.blockNumber);
    
    console.log("\n=== Detalhes dos Blocos com Transações de Votação ===");
    
    for (const block of votingBlocks) {
      // Converter timestamp para data legível
      const date = new Date(block.timestamp * 1000);
      
      console.log(`\nBloco #${block.blockNumber}`);
      console.log(`Timestamp: ${block.timestamp} (${date.toLocaleString()})`);
      console.log(`Transações: ${block.transactions.length}`);
      
      // Listar transações resumidamente
      for (let i = 0; i < block.transactions.length; i++) {
        const tx = block.transactions[i];
        console.log(`  Transação ${i+1}:`);
        console.log(`    Hash: ${tx.hash}`);
        console.log(`    De: ${tx.from || "Não identificado"}`);
        console.log(`    Tipo: ${tx.type}`);
        
        if (tx.candidateName) {
          console.log(`    Candidato: ${tx.candidateName}`);
        }
        
        // Se for transação de voto, tentar obter mais detalhes
        if (tx.type === "vote") {
          console.log(`    Descrição: Registro de voto`);
          
          // Tentar decodificar mais informações
          try {
            const txDetails = await provider.getTransaction(tx.hash);
            
            // Confirmar endereço do remetente
            if (txDetails && txDetails.from && (!tx.from || tx.from === "desconhecido")) {
              console.log(`    De (corrigido): ${txDetails.from}`);
            }
            
            // Não tentar decodificar a função aqui para manter o resumo conciso
          } catch (error) {
            // Ignorar erros
          }
        }
      }
    }
    
    // Salvar os resultados em um arquivo para referência
    const fs = require('fs');
    const outputData = {
      contractAddress: contractAddress,
      totalBlocks: votingBlocks.length,
      blocks: votingBlocks
    };
    
    fs.writeFileSync('voting-blocks.json', JSON.stringify(outputData, null, 2));
    console.log(`\nResultados salvos em 'voting-blocks.json'`);
  } else {
    console.log("Nenhum bloco encontrado com transações do contrato.");
    console.log("\nRecomendações para solução de problemas:");
    console.log("1. Verifique se o endereço do contrato está correto");
    console.log("2. Confirme se os votos foram realmente registrados na blockchain");
    console.log("3. Verifique se você está conectado à rede correta");
    console.log("4. Tente aumentar o intervalo de blocos para busca");
  }
  
  await prompt("\nPressione Enter para voltar ao menu principal...");
}

// Função principal
async function main() {
  try {
    console.log("Conectando ao contrato Ballot...");
    
    // Conectar ao contrato
    const ballot = await connectToBallot().catch(async (error) => {
      console.log("Não foi possível encontrar o endereço do contrato.");
      const address = await prompt("Digite o endereço do contrato (ou deixe em branco para sair): ");
      if (!address.trim()) {
        console.log("Saindo do sistema de votação...");
        rl.close();
        process.exit(0);
      }
      return await connectToBallot(address.trim());
    });
    
    // Obter as contas
    const accounts = await ethers.getSigners();
    
    let running = true;
    
    while (running) {
      const choice = await showMainMenu();
      
      switch (choice) {
        case '1':
          await showContractInfo(ballot, accounts);
          break;
        case '2':
          await giveRightToVoteMenu(ballot, accounts);
          break;
        case '3':
          await voteMenu(ballot, accounts);
          break;
        case '4':
          await showResultsMenu(ballot);
          break;
        case '5':
          await monitorEventsMenu(ballot);
          break;
        case '6':
          await exploreBlocksMenu(ballot);
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