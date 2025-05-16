// find-voting-blocks.js
// Script para encontrar blocos contendo transações do contrato de votação
const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("=== Blocos com Transações do Contrato de Votação ===");
  
  // Carregar o endereço do contrato
  let contractAddress;
  try {
    const addressFile = fs.readFileSync('contract-address.txt', 'utf8');
    contractAddress = addressFile.split(':')[1].trim();
  } catch (error) {
    console.error("Erro ao ler o endereço do contrato. Certifique-se de que o deploy foi executado.");
    process.exit(1);
  }
  
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
  
  // Criar uma spinner de progresso simples
  let progressChar = ['|', '/', '-', '\\'];
  let progressIndex = 0;
  let progressInterval = setInterval(() => {
    process.stdout.write(`\rVerificando blocos... ${progressChar[progressIndex]} `);
    progressIndex = (progressIndex + 1) % progressChar.length;
  }, 250);
  
  // Procurar blocos com transações para o contrato
  let lastProgressUpdate = 0;
  for (let blockNumber = 1; blockNumber <= currentBlock; blockNumber++) {
    // Atualizar progresso a cada 100 blocos
    if (blockNumber - lastProgressUpdate >= 100) {
      process.stdout.write(`\rVerificando blocos... ${Math.floor((blockNumber / currentBlock) * 100)}% completo (${blockNumber}/${currentBlock})`);
      lastProgressUpdate = blockNumber;
    }
    
    try {
      const block = await provider.getBlock(blockNumber, true);
      
      if (block && block.transactions && block.transactions.length > 0) {
        // Array para armazenar transações relacionadas ao contrato
        let contractRelatedTxs = [];
        
        // Verificar cada transação no bloco
        for (const tx of block.transactions) {
          // 1. Verificar transações PARA o contrato (interações com o contrato)
          if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
            contractRelatedTxs.push({
              hash: tx.hash,
              from: tx.from,
              type: "interaction"
            });
          } 
          // 2. Verificar transações de DEPLOY do contrato (tx.to é null)
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
          // Este bloco contém transações relacionadas ao contrato de votação
          votingBlocks.push({
            blockNumber: blockNumber,
            timestamp: block.timestamp,
            transactions: contractRelatedTxs
          });
        }
      }
    } catch (error) {
      // Ignorar erros de bloco (podem ocorrer em alguns casos)
    }
  }
  
  // Limpar o intervalo de progresso
  clearInterval(progressInterval);
  process.stdout.write(`\rVerificando blocos... 100% completo (${currentBlock}/${currentBlock})\n\n`);
  
  // Exibir resultados
  console.log(`Total de blocos encontrados com transações do contrato: ${votingBlocks.length}`);
  
  if (votingBlocks.length > 0) {
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
        console.log(`    De: ${tx.from}`);
        console.log(`    Tipo: ${tx.type || "interação"}`);
        
        if (tx.type === "deploy") {
          console.log(`    Descrição: Criação do contrato`);
        } else {
          try {
            // Obter os detalhes completos da transação
            const txDetails = await provider.getTransaction(tx.hash);
            
            // Obter o recibo para verificar eventos
            const receipt = await provider.getTransactionReceipt(tx.hash);
            
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
                // Se for giveRightToVote, mostrar o eleitor
                else if (functionFragment.name === "giveRightToVote") {
                  const decodedData = contractInterface.decodeFunctionData(functionFragment, txDetails.data);
                  console.log(`    Eleitor: ${decodedData[0]}`);
                }
              }
            } catch (e) {
              console.log(`    Não foi possível decodificar a função chamada`);
            }
            
            if (receipt && receipt.logs && receipt.logs.length > 0) {
              // Decodificar eventos
              const Ballot = await hre.ethers.getContractFactory("Ballot");
              const ballot = Ballot.attach(contractAddress);
              
              for (const log of receipt.logs) {
                try {
                  // Tentar decodificar o log como um evento
                  const parsedLog = ballot.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                  });
                  
                  if (parsedLog) {
                    console.log(`    Evento: ${parsedLog.name}`);
                    
                    // Se for um VoteCast, mostrar detalhes
                    if (parsedLog.name === "VoteCast") {
                      console.log(`    Bloco registrado no evento: ${parsedLog.args[0]}`);
                      console.log(`    Candidato no evento: ${parsedLog.args[1]}`);
                    }
                  }
                } catch (e) {
                  // Ignorar erros de parsing
                }
              }
            }
          } catch (error) {
            console.log(`    Erro ao obter detalhes da transação: ${error.message}`);
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
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("\nErro durante a execução:");
    console.error(error);
    process.exit(1);
  });