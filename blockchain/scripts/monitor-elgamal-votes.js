// monitor-elgamal-votes.js
// Script para buscar e analisar votos cifrados ElGamal na blockchain
// Baseado no monitor-blocks.js original
// Execução: npx hardhat run scripts/monitor-elgamal-votes.js --network poa

const hre = require("hardhat");
const fs = require('fs');

// ==================== FUNÇÕES MATEMÁTICAS ====================

function modPow(base, exponent, modulus) {
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent % 2n === 1n) {
            result = (result * base) % modulus;
        }
        exponent = exponent / 2n;
        base = (base * base) % modulus;
    }
    return result;
}

// ==================== FUNÇÕES DE ANÁLISE ====================

async function loadContractInfo() {
    console.log("\n========== CARREGANDO INFORMAÇÕES DO CONTRATO ==========");
    
    // Tenta carregar do arquivo JSON se existir
    if (fs.existsSync('elgamal-contract.json')) {
        const data = JSON.parse(fs.readFileSync('elgamal-contract.json', 'utf8'));
        console.log("✓ Informações carregadas de elgamal-contract.json");
        console.log(`  Contrato: ${data.contract}`);
        console.log(`  P: ${data.p}`);
        console.log(`  G: ${data.g}`);
        console.log(`  H: ${data.h}`);
        console.log(`  Deploy: ${data.deployed}`);
        return data;
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

async function analyzeEncryptedVote(voteData) {
    console.log("\n  📊 Análise do voto cifrado:");
    
    // Candidato 1
    console.log("  Candidato 1:");
    console.log(`    C1 = ${voteData.c1_candidate1}`);
    console.log(`    C2 = ${voteData.c2_candidate1}`);
    
    // Candidato 2
    console.log("  Candidato 2:");
    console.log(`    C1 = ${voteData.c1_candidate2}`);
    console.log(`    C2 = ${voteData.c2_candidate2}`);
    
    // Metadados
    console.log(`  Eleitor: ${voteData.voter}`);
    console.log(`  Timestamp: ${new Date(Number(voteData.timestamp) * 1000).toLocaleString()}`);
    
    // Análise de padrões
    console.log("\n  🔍 Análise de padrões:");
    
    // Verificar se os valores são válidos (menores que P)
    if (voteData.p) {
        const p = BigInt(voteData.p);
        const isValid = 
            BigInt(voteData.c1_candidate1) < p &&
            BigInt(voteData.c2_candidate1) < p &&
            BigInt(voteData.c1_candidate2) < p &&
            BigInt(voteData.c2_candidate2) < p;
        
        console.log(`    Valores válidos (< P): ${isValid ? '✓ SIM' : '✗ NÃO'}`);
    }
    
    // Detectar possível voto nulo (ambos zeros cifrados)
    // G^0 = 1, então C1 seria G^R e C2 seria H^R * 1
    console.log(`    C1 iguais: ${voteData.c1_candidate1 === voteData.c1_candidate2 ? 'SIM (mesmo R usado)' : 'NÃO (R diferentes)'}`);
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
        
        console.log("📐 Parâmetros ElGamal do contrato:");
        console.log(`  P (primo): ${p}`);
        console.log(`  G (gerador): ${g}`);
        console.log(`  H (chave pública): ${h}`);
        
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
                c1_candidate1: voteData[0].toString(),
                c2_candidate1: voteData[1].toString(),
                c1_candidate2: voteData[2].toString(),
                c2_candidate2: voteData[3].toString(),
                voter: voteData[4],
                timestamp: voteData[5].toString(),
                p: p.toString()
            };
            
            votes.push(vote);
            await analyzeEncryptedVote(vote);
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
                from: tx.from,
                gasUsed: receipt.gasUsed.toString(),
                timestamp: block.timestamp,
                voter: event.args[0],
                c1_candidate1: event.args[1].toString(),
                c2_candidate1: event.args[2].toString(),
                c1_candidate2: event.args[3].toString(),
                c2_candidate2: event.args[4].toString()
            };
            
            blockVotes[blockNumber].push(voteInfo);
        }
        
        // Exibir informações por bloco
        console.log("📦 VOTOS ORGANIZADOS POR BLOCO:");
        console.log("═".repeat(50));
        
        for (const [blockNum, blockVoteList] of Object.entries(blockVotes)) {
            const block = await provider.getBlock(Number(blockNum));
            
            console.log(`\n🔷 BLOCO #${blockNum}`);
            console.log(`  Hash: ${block.hash}`);
            console.log(`  Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
            console.log(`  Votos neste bloco: ${blockVoteList.length}`);
            
            for (const voteInfo of blockVoteList) {
                console.log(`\n  📍 Transação: ${voteInfo.txHash}`);
                console.log(`     De: ${voteInfo.from}`);
                console.log(`     Gas usado: ${voteInfo.gasUsed}`);
                console.log(`     Valores cifrados:`);
                console.log(`       Candidato 1: C1=${voteInfo.c1_candidate1}, C2=${voteInfo.c2_candidate1}`);
                console.log(`       Candidato 2: C1=${voteInfo.c1_candidate2}, C2=${voteInfo.c2_candidate2}`);
            }
        }
        
        // Agregação homomórfica (demonstração)
        console.log("\n========== AGREGAÇÃO HOMOMÓRFICA (DEMONSTRAÇÃO) ==========");
        console.log("Multiplicando todos os votos cifrados...\n");
        
        if (votes.length > 0 && p) {
            const pBig = BigInt(p);
            
            // Agregação para candidato 1
            let c1_agg_cand1 = 1n;
            let c2_agg_cand1 = 1n;
            
            // Agregação para candidato 2
            let c1_agg_cand2 = 1n;
            let c2_agg_cand2 = 1n;
            
            for (const vote of votes) {
                // Candidato 1
                c1_agg_cand1 = (c1_agg_cand1 * BigInt(vote.c1_candidate1)) % pBig;
                c2_agg_cand1 = (c2_agg_cand1 * BigInt(vote.c2_candidate1)) % pBig;
                
                // Candidato 2
                c1_agg_cand2 = (c1_agg_cand2 * BigInt(vote.c1_candidate2)) % pBig;
                c2_agg_cand2 = (c2_agg_cand2 * BigInt(vote.c2_candidate2)) % pBig;
            }
            
            console.log("📊 Resultado da agregação:");
            console.log("\nCandidato 1 (agregado):");
            console.log(`  C1_final = ${c1_agg_cand1}`);
            console.log(`  C2_final = ${c2_agg_cand1}`);
            
            console.log("\nCandidato 2 (agregado):");
            console.log(`  C1_final = ${c1_agg_cand2}`);
            console.log(`  C2_final = ${c2_agg_cand2}`);
            
            console.log("\n⚠️  Nota: Para decifrar estes valores agregados, seria necessária");
            console.log("   a chave privada X do trustee (não disponível on-chain)");
            
            // Tentar estimar votos (apenas demonstração)
            console.log("\n🔮 Estimativa baseada em padrões:");
            console.log(`  Total de votos cifrados: ${votes.length}`);
            console.log(`  Cada eleitor votou em exatamente 1 candidato`);
            console.log(`  Soma esperada: ${votes.length} votos distribuídos entre os candidatos`);
        }
        
        // Salvar resultados
        const outputData = {
            contractAddress,
            parameters: { p: p.toString(), g: g.toString(), h: h.toString() },
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

async function displaySummary(votes) {
    if (votes.length === 0) {
        return;
    }
    
    console.log("\n========== RESUMO DA ANÁLISE ==========");
    console.log(`📊 Estatísticas:`);
    console.log(`  • Total de votos: ${votes.length}`);
    
    // Contar eleitores únicos
    const uniqueVoters = new Set(votes.map(v => v.voter));
    console.log(`  • Eleitores únicos: ${uniqueVoters.size}`);
    
    // Primeira e última votação
    const timestamps = votes.map(v => Number(v.timestamp));
    const firstVote = new Date(Math.min(...timestamps) * 1000);
    const lastVote = new Date(Math.max(...timestamps) * 1000);
    
    console.log(`  • Primeira votação: ${firstVote.toLocaleString()}`);
    console.log(`  • Última votação: ${lastVote.toLocaleString()}`);
    
    // Listar eleitores
    console.log("\n👥 Eleitores que votaram:");
    for (const voter of uniqueVoters) {
        console.log(`  • ${voter}`);
    }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function main() {
    try {
        console.log("================================================");
        console.log("   MONITOR DE VOTOS ELGAMAL NA BLOCKCHAIN");
        console.log("================================================");
        
        // Carregar informações do contrato
        const contractInfo = await loadContractInfo();
        
        if (!contractInfo.contract) {
            console.log("❌ Endereço do contrato não fornecido");
            process.exit(1);
        }
        
        // Buscar e analisar votos
        const votes = await findElGamalVotes(contractInfo.contract);
        
        // Exibir resumo
        await displaySummary(votes);
        
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