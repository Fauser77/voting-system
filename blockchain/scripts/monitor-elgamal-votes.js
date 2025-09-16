// monitor-elgamal-votes.js
// Script para buscar e analisar votos cifrados ElGamal na blockchain
// Baseado no monitor-blocks.js original
// Execução: npx hardhat run scripts/monitor-elgamal-votes.js --network poa

const hre = require("hardhat");
const fs = require('fs');

// ==================== FUNÇÕES DE ANÁLISE ====================

async function loadContractInfo() {
    console.log("\n========== CARREGANDO INFORMAÇÕES DO CONTRATO ==========");
    
    // Tenta carregar do arquivo JSON se existir
    if (fs.existsSync('elgamal-contract.json')) {
        const contractData = JSON.parse(fs.readFileSync('elgamal-contract.json', 'utf8'));
        
        // Carregar parâmetros do arquivo separado
        let params = {};
        if (fs.existsSync('elgamal-params.json')) {
            params = JSON.parse(fs.readFileSync('elgamal-params.json', 'utf8'));
        }
        
        console.log("✔ Informações carregadas:");
        console.log(`  Contrato: ${contractData.contract}`);
        if (params.p) {
            console.log(`  P: ${params.p.substring(0, 50)}...`);
            console.log(`  G: ${params.g}`);
            console.log(`  H: ${params.h.substring(0, 50)}...`);
        }
        console.log(`  Deploy: ${contractData.deployed}`);
        
        return {
            contract: contractData.contract,
            p: params.p,
            g: params.g,
            h: params.h,
            deployed: contractData.deployed
        };
    } else {
        console.log("⚠️  Arquivo elgamal-contract.json não encontrado");
        console.log("   Use o endereço padrão ou execute deploy-elgamal.js primeiro");
        
        // Solicita endereço manualmente
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('Digite o endereço do contrato ElGamalVoting: ', (address) => {
                rl.close();
                resolve({ contract: address });
            });
        });
    }
}

async function searchByTransactionHash(txHash) {
    console.log("\n========== BUSCANDO TRANSAÇÃO ESPECÍFICA ==========");
    console.log(`Hash: ${txHash}\n`);
    
    const provider = hre.ethers.provider;
    
    try {
        const tx = await provider.getTransaction(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);
        const block = await provider.getBlock(tx.blockNumber);
        
        console.log("📦 INFORMAÇÕES DO BLOCO:");
        console.log(`  Número: ${block.number}`);
        console.log(`  Hash do Bloco: ${block.hash}`);
        console.log(`  Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        
        console.log("\n📄 INFORMAÇÕES DA TRANSAÇÃO:");
        console.log(`  De (Relayer): ${tx.from}`);
        console.log(`  Para (Contrato): ${tx.to}`);
        console.log(`  Gas Usado: ${receipt.gasUsed}`);
        console.log(`  Status: ${receipt.status === 1 ? '✓ Sucesso' : '✗ Falhou'}`);
        
        // Decodificar eventos
        if (receipt.logs.length > 0) {
            console.log("\n📊 EVENTOS EMITIDOS:");
            for (const log of receipt.logs) {
                if (log.topics[0] === hre.ethers.id("VoteSubmitted(bytes32,uint256[],uint256[],uint256,address)")) {
                    console.log("  Evento: VoteSubmitted");
                    console.log(`  Relayer: ${'0x' + log.topics[1].slice(26)}`);
                    console.log("  ⚠️ Endereço real do eleitor: MASCARADO pelo relayer");
                }
            }
        }
        
        return { tx, receipt, block };
    } catch (error) {
        console.error(`❌ Erro ao buscar transação: ${error.message}`);
        return null;
    }
}

async function analyzeEncryptedVote(voteData, candidateNames) {
    console.log("\n  📊 Análise do voto cifrado:");
    
    // Exibir valores cifrados para cada candidato
    candidateNames.forEach((name, idx) => {
        console.log(`  ${name}:`);
        console.log(`    C1 = ${voteData.c1_values[idx].toString().substring(0, 50)}...`);
        console.log(`    C2 = ${voteData.c2_values[idx].toString().substring(0, 50)}...`);
    });
    
    // Metadados
    console.log(`  Timestamp: ${new Date(Number(voteData.timestamp) * 1000).toLocaleString()}`);
    console.log(`  Relayer: ${voteData.relayer || 'Não disponível'}`);
    
    // Análise de padrões
    console.log("\n  🔍 Análise de padrões:");
    
    // Verificar se os valores são válidos (menores que P)
    if (voteData.p) {
        const p = BigInt(voteData.p);
        const allValid = voteData.c1_values.every((c1, idx) => 
            BigInt(c1) < p && BigInt(voteData.c2_values[idx]) < p
        );
        console.log(`    Valores válidos (< P): ${allValid ? '✓ SIM' : '✗ NÃO'}`);
    }
    
    // Detectar se todos C1 são iguais (mesmo R usado)
    const firstC1 = voteData.c1_values[0];
    const sameR = voteData.c1_values.every(c1 => c1 === firstC1);
    console.log(`    C1 iguais: ${sameR ? 'SIM (mesmo R usado)' : 'NÃO (R diferentes)'}`);
}

async function findElGamalVotes(contractAddress) {
    console.log("\n========== BUSCANDO VOTOS ELGAMAL NA BLOCKCHAIN ==========");
    console.log(`Contrato: ${contractAddress}\n`);
    
    const provider = hre.ethers.provider;
    const currentBlock = await provider.getBlockNumber();
    
    console.log(`Bloco atual: ${currentBlock}`);
    console.log("Buscando eventos VoteSubmitted...\n");
    
    try {
        // Conectar ao contrato
        const ElGamalVoting = await hre.ethers.getContractFactory("ElGamalVoting");
        const contract = await ElGamalVoting.attach(contractAddress);
        
        // Buscar parâmetros do contrato
        const p = await contract.p();
        const g = await contract.g();
        const h = await contract.h();
        const numCandidates = await contract.numCandidates();
        
        // Buscar nomes dos candidatos
        const candidateNames = [];
        for (let i = 0; i < numCandidates; i++) {
            const name = await contract.candidateNames(i);
            candidateNames.push(name);
        }
        
        console.log("🔐 Parâmetros ElGamal do contrato:");
        console.log(`  P (primo): ${p.toString().substring(0, 50)}...`);
        console.log(`  G (gerador): ${g}`);
        console.log(`  H (chave pública): ${h.toString().substring(0, 50)}...`);
        console.log(`  Número de candidatos: ${numCandidates}`);
        console.log(`  Candidatos: ${candidateNames.join(', ')}`);
        
        // Buscar total de votos
        const totalVotes = await contract.getTotalVotes();
        console.log(`\n📦 Total de votos registrados: ${totalVotes}`);
        
        if (totalVotes === 0n) {
            console.log("⚠️  Nenhum voto encontrado no contrato");
            return [];
        }
        
        // Coletar todos os votos
        const votes = [];
        console.log("\n========== VOTOS ENCONTRADOS ==========");
        
        for (let i = 0; i < totalVotes; i++) {
            console.log(`\n🗳️  VOTO #${i + 1}:`);
            console.log("─".repeat(40));
            
            const voteData = await contract.getVote(i);
            const vote = {
                index: i,
                c1_values: voteData[0].map(v => v.toString()),
                c2_values: voteData[1].map(v => v.toString()),
                timestamp: voteData[2].toString(),
                relayer: voteData[3],
                p: p.toString()
            };
            
            votes.push(vote);
            await analyzeEncryptedVote(vote, candidateNames);
        }
        
        // Buscar eventos para encontrar blocos específicos
        console.log("\n========== BUSCANDO BLOCOS DAS TRANSAÇÕES ==========");
        
        const filter = contract.filters.VoteSubmitted();
        const events = await contract.queryFilter(filter, 0, currentBlock);
        
        console.log(`Encontrados ${events.length} eventos VoteSubmitted\n`);
        
        const blockVotes = {};
        
        for (const event of events) {
            const blockNumber = event.blockNumber;
            const txHash = event.transactionHash;
            
            if (!blockVotes[blockNumber]) {
                blockVotes[blockNumber] = [];
            }
            
            // Buscar detalhes da transação
            const tx = await provider.getTransaction(txHash);
            const receipt = await provider.getTransactionReceipt(txHash);
            const block = await provider.getBlock(blockNumber);
            
            const voteInfo = {
                blockNumber,
                txHash,
                from: tx.from, // Será o relayer
                gasUsed: receipt.gasUsed.toString(),
                timestamp: block.timestamp,
                relayer: event.args[4] // Endereço do relayer do evento
            };
            
            blockVotes[blockNumber].push(voteInfo);
        }
        
        // Exibir informações por bloco
        console.log("📦 VOTOS ORGANIZADOS POR BLOCO:");
        console.log("═".repeat(50));
        
        for (const [blockNum, blockVoteList] of Object.entries(blockVotes)) {
            const block = await provider.getBlock(Number(blockNum));
            
            console.log(`\n📷 BLOCO #${blockNum}`);
            console.log(`  Hash: ${block.hash}`);
            console.log(`  Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
            console.log(`  Votos neste bloco: ${blockVoteList.length}`);
            
            for (const voteInfo of blockVoteList) {
                console.log(`\n  📋 Transação: ${voteInfo.txHash}`);
                console.log(`     Relayer: ${voteInfo.from}`);
                console.log(`     Gas usado: ${voteInfo.gasUsed}`);
                console.log(`     ⚠️ Endereço real do eleitor: MASCARADO`);
            }
        }
        
        // Agregação homomórfica
        console.log("\n========== AGREGAÇÃO HOMOMÓRFICA (DEMONSTRAÇÃO) ==========");
        
        if (votes.length > 0 && p) {
            const pBig = BigInt(p);
            
            // Inicializar agregação para cada candidato
            const aggregated = candidateNames.map(() => ({
                c1: 1n,
                c2: 1n
            }));
            
            // Agregar votos
            for (const vote of votes) {
                for (let i = 0; i < candidateNames.length; i++) {
                    aggregated[i].c1 = (aggregated[i].c1 * BigInt(vote.c1_values[i])) % pBig;
                    aggregated[i].c2 = (aggregated[i].c2 * BigInt(vote.c2_values[i])) % pBig;
                }
            }
            
            console.log("📊 Resultado da agregação:");
            candidateNames.forEach((name, idx) => {
                console.log(`\n${name} (agregado):`);
                console.log(`  C1_final = ${aggregated[idx].c1.toString().substring(0, 50)}...`);
                console.log(`  C2_final = ${aggregated[idx].c2.toString().substring(0, 50)}...`);
            });
            
            console.log("\n⚠️  Nota: Para decifrar estes valores agregados, seria necessária");
            console.log("   a chave privada X do trustee (não disponível on-chain)");
        }
        
        // Salvar resultados
        const outputData = {
            contractAddress,
            parameters: { p: p.toString(), g: g.toString(), h: h.toString() },
            candidateNames,
            totalVotes: totalVotes.toString(),
            votes,
            blockVotes,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('elgamal-votes-analysis.json', JSON.stringify(outputData, null, 2));
        console.log("\n✅ Análise salva em 'elgamal-votes-analysis.json'");
        
        return votes;
        
    } catch (error) {
        console.error("❌ Erro ao buscar votos:", error.message);
        console.log("\nPossíveis causas:");
        console.log("1. Contrato não existe neste endereço");
        console.log("2. Contrato não é do tipo ElGamalVoting");
        console.log("3. Rede não está acessível");
        return [];
    }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function main() {
    try {
        console.log("================================================");
        console.log("   MONITOR DE VOTOS ELGAMAL NA BLOCKCHAIN");
        console.log("================================================");
        
        // Verificar se foi passado um hash como argumento
        const args = process.argv.slice(2);
        if (args.length > 0 && args[0].startsWith('0x')) {
            await searchByTransactionHash(args[0]);
        } else {
            // Busca interativa
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const mode = await new Promise(resolve => 
                rl.question('\nModo de busca:\n1. Buscar todos os votos\n2. Buscar por hash de transação\nEscolha (1 ou 2): ', resolve)
            );
            
            if (mode === '2') {
                const hash = await new Promise(resolve => 
                    rl.question('Digite o hash da transação: ', resolve)
                );
                await searchByTransactionHash(hash);
            } else {
                const contractInfo = await loadContractInfo();
                if (contractInfo.contract) {
                    await findElGamalVotes(contractInfo.contract);
                }
            }
            
            rl.close();
        }
        
        console.log("\n================================================");
        console.log("         ANÁLISE CONCLUÍDA COM SUCESSO");
        console.log("================================================\n");
        
    } catch (error) {
        console.error("❌ Erro no monitor:", error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { findElGamalVotes };