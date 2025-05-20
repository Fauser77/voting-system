/**
 * Busca blocos com transações do contrato
 * @param {string} contractAddress - Endereço do contrato
 * @returns {Promise<Array>} Array de blocos com transações
 */
async function findVotingBlocks(contractAddress) {
  console.log("=== Blocos com Transações do Contrato de Votação ===");
  console.log(`Endereço do contrato: ${contractAddress}\n`);
  
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
  
  console.log(`\n\nTotal de blocos encontrados com transações do contrato: ${votingBlocks.length}`);
  
  // Ordenar blocos por número (do mais recente para o mais antigo)
  if (votingBlocks.length > 0) {
    votingBlocks.sort((a, b) => b.blockNumber - a.blockNumber);
  } else {
    console.log("\nRecomendações para solução de problemas:");
    console.log("1. Verifique se o endereço do contrato está correto");
    console.log("2. Confirme se os votos foram realmente registrados na blockchain");
    console.log("3. Verifique se você está conectado à rede correta");
    console.log("4. Tente aumentar o intervalo de blocos para busca");
  }
  
  return votingBlocks;
}// interact.js
// Script unificado para interagir com o contrato Ballot
const hre = require("hardhat");
const { 
  connectToBallot, 
  getContractAddress, 
  displayBallotInfo, 
  displayResults 
} = require('./utils');

/**
 * Concede direito de voto a um endereço
 * @param {Contract} ballot - Instância do contrato
 * @param {Signer} chairperson - O chairperson (admin)
 * @param {string} voterAddress - Endereço do eleitor
 * @returns {Promise<boolean>} Sucesso da operação
 */
async function giveRightToVote(ballot, chairperson, voterAddress) {
  console.log(`Verificando direito de voto para: ${voterAddress}`);
  
  // Verificar se já tem direito de voto
  const hasRight = await ballot.hasRightToVote(voterAddress);
  if (hasRight) {
    console.log(`  ✓ Endereço ${voterAddress} já possui direito de voto`);
    return true;
  }
  
  console.log(`  Dando direito de voto para ${voterAddress}`);
  
  try {
    // Chamar a função giveRightToVote como chairperson
    const tx = await ballot.connect(chairperson).giveRightToVote(voterAddress);
    await tx.wait(); // Aguardar a confirmação da transação
    
    // Verificar se o direito de voto foi concedido
    const hasRightNow = await ballot.hasRightToVote(voterAddress);
    console.log(`  ✓ Direito de voto concedido: ${hasRightNow}`);
    return hasRightNow;
  } catch (error) {
    console.error(`  ✗ Erro ao conceder direito de voto: ${error.message}`);
    return false;
  }
}

/**
 * Registra um voto
 * @param {Contract} ballot - Instância do contrato
 * @param {Signer} voter - O eleitor
 * @param {number} candidateIndex - Índice do candidato
 * @returns {Promise<boolean>} Sucesso da operação
 */
async function vote(ballot, voter, candidateIndex) {
  try {
    // Obter informações do candidato
    const candidate = await ballot.getCandidate(candidateIndex);
    console.log(`Votando no candidato: ${candidate[0]} (índice ${candidateIndex})`);
    
    // Chamar a função vote
    const tx = await ballot.connect(voter).vote(candidateIndex);
    await tx.wait(); // Aguardar a confirmação da transação
    
    console.log(`  ✓ Voto registrado com sucesso`);
    return true;
  } catch (error) {
    console.error(`  ✗ Erro ao registrar voto: ${error.message}`);
    return false;
  }
}

/**
 * Configura o monitoramento de eventos de voto
 * @param {Contract} ballot - Instância do contrato
 * @returns {Function} Função para parar o monitoramento
 */
function setupVoteMonitoring(ballot) {
  console.log("Iniciando monitoramento de eventos de voto...");
  console.log("Aguardando novos votos...\n");
  
  // Definir filtro para o evento VoteCast
  const filter = ballot.filters.VoteCast();
  
  // Função para lidar com eventos
  const handleEvent = async (blockNumber, candidateName) => {
    console.log(`[${new Date().toLocaleTimeString()}] Novo voto detectado:`);
    console.log(`  Bloco: ${blockNumber}`);
    console.log(`  Candidato: ${candidateName}`);
    
    // Atualizar contagem de votos
    await displayResults(ballot);
  };
  
  // Ouvir eventos
  ballot.on(filter, handleEvent);
  
  // Retornar função para remover o listener quando necessário
  return () => {
    console.log("Parando monitoramento de eventos...");
    ballot.off(filter, handleEvent);
  };
}

/**
 * Busca blocos com transações do contrato
 * @param {string} contractAddress - Endereço do contrato
 * @returns {Promise<Array>} Array de blocos com transações
 */
async function findVotingBlocks(contractAddress) {
  console.log("=== Blocos com Transações do Contrato de Votação ===");
  console.log(`Endereço do contrato: ${contractAddress}\n`);
  
  // Conectar ao provider
  const provider = hre.ethers.provider;
  
  // Obter o número do bloco atual
  const currentBlock = await provider.getBlockNumber();
  console.log(`Bloco atual: ${currentBlock}`);
  
  // Armazenar informações sobre blocos contendo transações do contrato
  const votingBlocks = [];
  
  console.log("\nBuscando blocos com transações do contrato de votação...");
  console.log("(Este processo pode levar algum tempo. Por favor, aguarde.)\n");
  
  // Procurar blocos com transações para o contrato
  for (let blockNumber = 1; blockNumber <= currentBlock; blockNumber++) {
    // Log de progresso a cada 100 blocos
    if (blockNumber % 100 === 0) {
      process.stdout.write(`\rVerificando blocos... ${Math.floor((blockNumber / currentBlock) * 100)}% completo (${blockNumber}/${currentBlock})`);
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
            contractRelatedTxs.push({
              hash: tx.hash,
              from: tx.from,
              type: "interaction"
            });
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
                  type: "deploy"
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
  
  console.log(`\n\nTotal de blocos encontrados com transações do contrato: ${votingBlocks.length}`);
  return votingBlocks;
}

/**
 * Função principal para interação básica com o contrato
 */
async function main() {
  try {
    console.log("=== Interagindo com o contrato Ballot ===");
    
    // Conectar ao contrato
    const ballot = await connectToBallot();
    
    // Obter as contas
    const accounts = await hre.ethers.getSigners();
    const chairperson = accounts[0];
    const voters = accounts.slice(1, 5); // Eleitores 1-4
    
    console.log(`Chairperson: ${chairperson.address}`);
    for (let i = 0; i < voters.length; i++) {
      console.log(`Eleitor ${i+1}: ${voters[i].address}`);
    }
    console.log("-".repeat(50));
    
    // Verificar o estado inicial do contrato
    await displayBallotInfo(ballot);
    console.log("-".repeat(50));
    
    // Conceder direitos de voto
    console.log("=== Concedendo Direitos de Voto ===");
    for (let i = 0; i < voters.length; i++) {
      await giveRightToVote(ballot, chairperson, voters[i].address);
    }
    console.log("-".repeat(50));
    
    // Registrar votos
    console.log("=== Registrando Votos ===");
    
    // Distribuição de votos
    const votingPlan = [
      { voter: voters[0], choice: 0 }, // Eleitor 1 vota no candidato 0
      { voter: voters[1], choice: 1 }, // Eleitor 2 vota no candidato 1
      { voter: voters[2], choice: 2 }, // Eleitor 3 vota no candidato 2
      { voter: voters[3], choice: 0 }  // Eleitor 4 vota no candidato 0
    ];
    
    for (let i = 0; i < votingPlan.length; i++) {
      const { voter, choice } = votingPlan[i];
      await vote(ballot, voter, choice);
    }
    console.log("-".repeat(50));
    
    // Mostrar resultados
    await displayResults(ballot);
    
    console.log("\nInteração com o contrato concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante a interação com o contrato:");
    console.error(error);
    process.exit(1);
  }
}

// Exportar funções para uso em outros scripts
module.exports = {
  giveRightToVote,
  vote,
  setupVoteMonitoring,
  findVotingBlocks
};

// Executar como script principal se chamado diretamente
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Erro durante a execução:");
      console.error(error);
      process.exit(1);
    });
}