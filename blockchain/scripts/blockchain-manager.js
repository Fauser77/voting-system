#!/usr/bin/env node
// blockchain-manager.js
// Gerenciador unificado para todas as operações com contratos de votação
const { ethers } = require('hardhat');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Importar nossos módulos refatorados
const { deployContract } = require('./deploy');
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
  console.log("=== Sistema de Gerenciamento Blockchain ===");
  console.log("1. Verificar Contas de Eleitores");
  console.log("2. Implantar Novo Contrato de Votação");
  console.log("3. Interagir com Contrato Existente");
  console.log("4. Monitoramento e Análise");
  console.log("0. Sair");
  console.log("-".repeat(45));
  
  const choice = await prompt("Escolha uma opção: ");
  return choice;
}

// Função para verificar contas de eleitores
async function checkVoterAccounts() {
  console.clear();
  console.log("=== Verificação das contas de eleitores ===");
  
  // Obter as contas
  const accounts = await ethers.getSigners();
  const chairperson = accounts[0];
  
  console.log(`Chairperson: ${chairperson.address}`);
  const chairpersonBalance = await ethers.provider.getBalance(chairperson.address);
  console.log(`Saldo: ${ethers.formatEther(chairpersonBalance)} ETH`);
  
  // Verificar outras contas de eleitores
  console.log("\n=== Contas de eleitores ===");
  for (let i = 1; i < Math.min(accounts.length, 5); i++) {
    const voterAddress = accounts[i].address;
    const balance = await ethers.provider.getBalance(voterAddress);
    
    console.log(`Eleitor ${i}: ${voterAddress}`);
    console.log(`Saldo: ${ethers.formatEther(balance)} ETH`);
    
    console.log("-".repeat(50));
  }
  
  console.log("Verificação de contas concluída!");
  await prompt("\nPressione Enter para voltar ao menu principal...");
}

// Função para implantar novo contrato
async function deployNewContract() {
  console.clear();
  console.log("=== Implantação de Novo Contrato de Votação ===");
  
  // Verificar a rede atual
  const networkName = hre.network.name;
  const isPoA = networkName.includes('poa') || networkName.includes('geth');
  const networkType = isPoA ? "PoA" : "local";
  
  console.log(`Rede atual: ${networkName} (Tipo: ${networkType})`);
  
  // Solicitar nomes de candidatos
  console.log("\nDigite os nomes dos candidatos (deixe em branco para concluir):");
  
  const candidateNames = [];
  let candidateCount = 1;
  
  while (true) {
    const name = await prompt(`Candidato ${candidateCount}: `);
    if (!name.trim()) break;
    
    candidateNames.push(name.trim());
    candidateCount++;
    
    // Limitar número máximo de candidatos
    if (candidateCount > 10) {
      console.log("Número máximo de candidatos atingido (10).");
      break;
    }
  }
  
  // Verificar se temos candidatos suficientes
  if (candidateNames.length < 2) {
    console.log("É necessário pelo menos 2 candidatos para uma votação.");
    await prompt("\nPressione Enter para voltar ao menu principal...");
    return;
  }
  
  console.log(`\nCandidatos para esta votação: ${candidateNames.join(", ")}`);
  const confirm = await prompt("\nConfirmar implantação do contrato? (s/n): ");
  
  if (confirm.toLowerCase() !== 's') {
    console.log("Implantação cancelada.");
    await prompt("\nPressione Enter para voltar ao menu principal...");
    return;
  }
  
  console.log("\nIniciando deploy do contrato...");
  
  try {
    // Deploy do contrato
    const ballot = await deployContract(candidateNames, { 
      network: networkType,
      gasLimit: isPoA ? 5000000 : 3000000 
    });
    
    console.log("\nDeploy do contrato concluído com sucesso!");
    console.log(`Endereço do contrato Ballot: ${await ballot.getAddress()}`);
    
    // Perguntar se quer interagir com o contrato
    const interact = await prompt("\nDeseja interagir com o contrato agora? (s/n): ");
    
    if (interact.toLowerCase() === 's') {
      return ballot; // Retornar o contrato para interação
    }
  } catch (error) {
    console.error("Erro durante o deploy:");
    console.error(error);
  }
  
  await prompt("\nPressione Enter para voltar ao menu principal...");
  return null;
}

// Função para interagir com contrato existente
async function interactWithContract() {
  console.clear();
  console.log("=== Interagir com Contrato Existente ===");
  
  // Obter o endereço do contrato
  let ballot;
  try {
    ballot = await connectToBallot();
    console.log(`Conectado ao contrato no endereço: ${await ballot.getAddress()}`);
  } catch (error) {
    console.log("Não foi possível encontrar o endereço do contrato automaticamente.");
    
    // Solicitar endereço manualmente
    const address = await prompt("Digite o endereço do contrato (ou deixe em branco para cancelar): ");
    if (!address.trim()) {
      console.log("Operação cancelada.");
      await prompt("\nPressione Enter para voltar ao menu principal...");
      return null;
    }
    
    try {
      ballot = await connectToBallot(address.trim());
      console.log(`Conectado ao contrato no endereço: ${await ballot.getAddress()}`);
    } catch (error) {
      console.error("Erro ao conectar ao contrato:");
      console.error(error);
      await prompt("\nPressione Enter para voltar ao menu principal...");
      return null;
    }
  }
  
  return ballot; // Retornar o contrato para interação
}

// Menu de interação com o contrato
async function contractInteractionMenu(ballot) {
  if (!ballot) return;
  
  // Obter as contas
  const accounts = await ethers.getSigners();
  
  let running = true;
  
  while (running) {
    console.clear();
    console.log(`=== Interação com Contrato: ${await ballot.getAddress()} ===`);
    console.log("1. Ver Informações do Contrato");
    console.log("2. Dar Direito de Voto");
    console.log("3. Votar");
    console.log("4. Ver Resultados");
    console.log("5. Monitorar Eventos");
    console.log("0. Voltar ao Menu Principal");
    console.log("-".repeat(45));
    
    const choice = await prompt("Escolha uma opção: ");
    
    switch (choice) {
      case '1':
        // Ver informações do contrato
        console.clear();
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
        
        await prompt("\nPressione Enter para continuar...");
        break;
        
      case '2':
        // Dar direito de voto
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
        if (accountIndex === '0') break;
        
        const index = parseInt(accountIndex);
        if (isNaN(index) || index < 1 || index >= accounts.length) {
          console.log("Índice inválido!");
          await prompt("Pressione Enter para continuar...");
          break;
        }
        
        const voterAddress = accounts[index].address;
        await giveRightToVote(ballot, chairperson, voterAddress);
        
        await prompt("\nPressione Enter para continuar...");
        break;
        
      case '3':
        // Votar
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
        
        const voterIndex = await prompt("\nDigite o número da conta (9 para voltar): ");
        if (voterIndex === '9') break;
        
        const vidx = parseInt(voterIndex);
        if (isNaN(vidx) || vidx < 0 || vidx >= accounts.length) {
          console.log("Índice inválido!");
          await prompt("Pressione Enter para continuar...");
          break;
        }
        
        const voter = accounts[vidx];
        
        // Verificar se tem direito de voto
        const hasRight = await ballot.hasRightToVote(voter.address);
        if (!hasRight) {
          console.log(`\nA conta ${voter.address} não tem direito de voto.`);
          await prompt("Pressione Enter para continuar...");
          break;
        }
        
        // Verificar se já votou
        const voterInfo = await ballot.voters(voter.address);
        if (voterInfo.isVoted) {
          console.log(`\nA conta ${voter.address} já votou.`);
          await prompt("Pressione Enter para continuar...");
          break;
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
          break;
        }
        
        await vote(ballot, voter, choice);
        await prompt("\nPressione Enter para continuar...");
        break;
        
      case '4':
        // Ver resultados
        console.clear();
        await displayResults(ballot);
        await prompt("\nPressione Enter para continuar...");
        break;
        
      case '5':
        // Monitorar eventos
        console.clear();
        console.log("=== Monitoramento de Eventos ===");
        console.log("Aguardando novos votos... (pressione Enter para voltar)");
        
        // Configurar monitoramento
        const stopMonitoring = setupVoteMonitoring(ballot);
        
        // Aguardar até o usuário pressionar Enter
        await prompt("");
        
        // Parar monitoramento
        stopMonitoring();
        break;
        
      case '0':
        running = false;
        break;
        
      default:
        console.log("Opção inválida!");
        await prompt("Pressione Enter para continuar...");
    }
  }
}

// Menu de monitoramento e análise
async function monitoringAnalysisMenu() {
  console.clear();
  console.log("=== Monitoramento e Análise ===");
  console.log("1. Encontrar Blocos com Transações de Votação");
  console.log("2. Monitorar Eventos de Votação em Tempo Real");
  console.log("0. Voltar ao Menu Principal");
  console.log("-".repeat(45));
  
  const choice = await prompt("Escolha uma opção: ");
  
  switch (choice) {
    case '1':
      // Encontrar blocos com transações
      console.clear();
      console.log("=== Encontrar Blocos com Transações de Votação ===");
      
      let contractAddress;
      try {
        const ballot = await connectToBallot();
        contractAddress = await ballot.getAddress();
      } catch (error) {
        console.log("Não foi possível encontrar o endereço do contrato automaticamente.");
        
        // Solicitar endereço manualmente
        contractAddress = await prompt("Digite o endereço do contrato: ");
        if (!contractAddress.trim()) {
          console.log("Operação cancelada.");
          await prompt("\nPressione Enter para voltar...");
          return;
        }
      }
      
      console.log(`\nBuscando blocos para o contrato: ${contractAddress}`);
      
      // Versão melhorada de findVotingBlocks implementada diretamente
      async function findVotingBlocksImproved(contractAddress) {
        console.log(`Buscando transações para o contrato: ${contractAddress}\n`);
        
        // Conectar ao provider
        const provider = hre.ethers.provider;
        
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
          // Conectar-se ao contrato
          const Ballot = await hre.ethers.getContractFactory("Ballot");
          const ballot = await Ballot.attach(contractAddress);
          
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
          
          // Obter informações detalhadas de cada transação
          for (let i = 0; i < block.transactions.length; i++) {
            const tx = block.transactions[i];
            console.log(`  Transação ${i+1}:`);
            console.log(`    Hash: ${tx.hash}`);
            console.log(`    De: ${tx.from || "Não identificado"}`);
            console.log(`    Tipo: ${tx.type}`);
            
            if (tx.candidateName) {
              console.log(`    Candidato: ${tx.candidateName}`);
            }
            
            if (tx.gasUsed) {
              console.log(`    Gas usado: ${tx.gasUsed}`);
            }
            
            if (tx.type === "deploy") {
              console.log(`    Descrição: Criação do contrato`);
            } else if (tx.type === "vote") {
              console.log(`    Descrição: Registro de voto`);
              
              // Tentar decodificar mais informações
              try {
                // Obter os detalhes completos da transação
                const txDetails = await provider.getTransaction(tx.hash);
                
                // Confirmar endereço do remetente
                if (txDetails && txDetails.from && (!tx.from || tx.from === "desconhecido")) {
                  console.log(`    De (corrigido): ${txDetails.from}`);
                  // Atualizar o valor no objeto
                  tx.from = txDetails.from;
                }
                
                // Decodificar dados da transação para entender a função chamada
                try {
                  const Ballot = await hre.ethers.getContractFactory("Ballot");
                  const contractInterface = Ballot.interface;
                  
                  const functionFragment = contractInterface.getFunction(txDetails.data.slice(0, 10));
                  if (functionFragment) {
                    console.log(`    Função: ${functionFragment.name}`);
                    
                    // Se for voto, tentar identificar o candidato
                    if (functionFragment.name === "vote") {
                      const decodedData = contractInterface.decodeFunctionData(functionFragment, txDetails.data);
                      const candidateIndex = Number(decodedData[0]);
                      try {
                        const ballot = Ballot.attach(contractAddress);
                        const candidate = await ballot.getCandidate(candidateIndex);
                        console.log(`    Candidato: ${candidate[0]} (índice ${candidateIndex})`);
                      } catch (e) {
                        console.log(`    Candidato índice: ${candidateIndex}`);
                      }
                    }
                  }
                } catch (e) {
                  // Ignorar erros de decodificação
                }
              } catch (error) {
                // Ignorar erros ao obter detalhes
              }
            }
          }
        }
        
        // Salvar os resultados em um arquivo para referência
        const outputData = {
          contractAddress: contractAddress,
          totalBlocks: votingBlocks.length,
          blocks: votingBlocks
        };
        
        fs.writeFileSync('voting-blocks.json', JSON.stringify(outputData, null, 2));
        console.log(`\nResultados salvos em 'voting-blocks.json'`);
      } else {
        console.log("Nenhum bloco encontrado com transações para o contrato.");
        console.log("\nRecomendações para solução de problemas:");
        console.log("1. Verifique se o endereço do contrato está correto");
        console.log("2. Confirme se os votos foram realmente registrados na blockchain");
        console.log("3. Verifique se você está conectado à rede correta");
        console.log("4. Tente aumentar o intervalo de blocos para busca");
      }
      
      await prompt("\nPressione Enter para voltar...");
      break;
      
    case '2':
      // Monitorar eventos
      console.clear();
      console.log("=== Monitorar Eventos de Votação em Tempo Real ===");
      
      let ballot;
      try {
        ballot = await connectToBallot();
        console.log(`Monitorando eventos para o contrato: ${await ballot.getAddress()}`);
      } catch (error) {
        console.log("Não foi possível encontrar o endereço do contrato automaticamente.");
        
        // Solicitar endereço manualmente
        const address = await prompt("Digite o endereço do contrato (ou deixe em branco para cancelar): ");
        if (!address.trim()) {
          console.log("Operação cancelada.");
          await prompt("\nPressione Enter para voltar...");
          return;
        }
        
        try {
          ballot = await connectToBallot(address.trim());
          console.log(`Monitorando eventos para o contrato: ${await ballot.getAddress()}`);
        } catch (error) {
          console.error("Erro ao conectar ao contrato:");
          console.error(error);
          await prompt("\nPressione Enter para voltar...");
          return;
        }
      }
      
      console.log("Aguardando novos votos... (pressione Enter para voltar)");
      
      // Configurar monitoramento
      const stopMonitoring = setupVoteMonitoring(ballot);
      
      // Aguardar até o usuário pressionar Enter
      await prompt("");
      
      // Parar monitoramento
      stopMonitoring();
      break;
      
    case '0':
    default:
      return;
  }
}

// Função principal
async function main() {
  try {
    let running = true;
    
    while (running) {
      const choice = await showMainMenu();
      
      switch (choice) {
        case '1':
          await checkVoterAccounts();
          break;
          
        case '2':
          const newBallot = await deployNewContract();
          if (newBallot) {
            await contractInteractionMenu(newBallot);
          }
          break;
          
        case '3':
          const existingBallot = await interactWithContract();
          if (existingBallot) {
            await contractInteractionMenu(existingBallot);
          }
          break;
          
        case '4':
          await monitoringAnalysisMenu();
          break;
          
        case '0':
          running = false;
          break;
          
        default:
          console.log("Opção inválida!");
          await prompt("Pressione Enter para continuar...");
      }
    }
    
    console.log("Saindo do sistema...");
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error("Erro durante a execução:");
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

// Executar função principal
main();