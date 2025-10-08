const hre = require("hardhat");
const fs = require('fs');
const { homomorphicAggregation, decryptAggregatedResults, getContractConfig } = require('./elgamal-utils');
require('dotenv').config();

// ==================== FUNÇÕES DE VERIFICAÇÃO ====================

async function searchVote(txHash, config) {
    console.log("\n========== BUSCA POR TRANSAÇÃO ==========");
    console.log(`Hash: ${txHash}`);
    
    const provider = hre.ethers.provider;
    
    try {
        const tx = await provider.getTransaction(txHash);
        
        if (!tx) {
            throw new Error("Transação não encontrada na blockchain");
        }
        
        // Verificar se é uma transação para o contrato correto
        if (tx.to.toLowerCase() !== config.contract.target.toLowerCase()) {
            throw new Error(
                `Transação inválida!\n` +
                `  A transação foi enviada para: ${tx.to}\n` +
                `  Contrato de votação esperado: ${config.contract.target}\n` +
                `  Esta transação não é um voto no contrato especificado.`
            );
        }
        
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (!receipt) {
            throw new Error("Receipt da transação não encontrado");
        }
        
        if (receipt.status !== 1) {
            throw new Error("A transação falhou na blockchain");
        }
        
        const block = await provider.getBlock(tx.blockNumber);
        
        console.log("\n📦 INFORMAÇÕES DO BLOCO:");
        console.log(`  Número: ${block.number}`);
        console.log(`  Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
        
        console.log("\n📄 INFORMAÇÕES DA TRANSAÇÃO:");
        console.log(`  De (Relayer): ${tx.from}`);
        console.log(`  Para (Contrato): ${tx.to}`);
        console.log(`  Status: ✓ Sucesso`);
        
        // Buscar o voto específico através dos eventos
        const filter = config.contract.filters.VoteSubmitted();
        const events = await config.contract.queryFilter(filter, block.number, block.number);
        
        // Encontrar o evento específico desta transação
        const voteEvent = events.find(e => e.transactionHash === txHash);
        
        if (!voteEvent) {
            throw new Error("Esta transação não contém um evento de voto válido");
        }
        
        // Buscar dados do voto usando o índice do evento
        const allEvents = await config.contract.queryFilter(filter, 0, block.number);
        const voteIndex = allEvents.findIndex(e => e.transactionHash === txHash);
        
        if (voteIndex === -1) {
            throw new Error("Erro ao determinar o índice do voto no contrato");
        }
        
        const voteData = await config.contract.getVote(voteIndex);
        
        console.log("\n🗳️ DADOS DO VOTO CIFRADO:");
        console.log(`  Índice do voto: #${voteIndex + 1}`);
        console.log(`  Timestamp: ${new Date(Number(voteData[2]) * 1000).toLocaleString()}`);
        console.log(`  Relayer: ${voteData[3]}`);
        
        console.log("\n🔐 VALORES CIFRADOS:");
        config.candidateNames.forEach((name, idx) => {
            console.log(`  ${name}:`);
            console.log(`    C1: ${voteData[0][idx].toString().substring(0, 40)}...`);
            console.log(`    C2: ${voteData[1][idx].toString().substring(0, 40)}...`);
        });
        
        console.log("\n⚠️ Nota: Os valores estão cifrados com ElGamal");
        console.log("   Garantindo privacidade total do conteúdo do voto");
        console.log("   Apenas o hash da transação serve como comprovante de participação");
        
        return {
            txHash,
            blockNumber: block.number,
            voteIndex: voteIndex + 1,
            timestamp: new Date(Number(voteData[2]) * 1000).toISOString(),
            relayer: voteData[3],
            encryptedValues: config.candidateNames.map((name, idx) => ({
                candidate: name,
                c1: voteData[0][idx].toString(),
                c2: voteData[1][idx].toString()
            }))
        };
        
    } catch (error) {
        throw error; 
    }
}

async function processElectionResults(config) {
    console.log("\n========== PROCESSANDO RESULTADO DA ELEIÇÃO ==========");
    
    // Usar getTotalVotes() do contrato
    const totalVotes = await config.contract.getTotalVotes();
    
    if (totalVotes === 0n) {
        console.log("⚠️ Nenhum voto registrado");
        return null;
    }
    
    console.log(`Total de votos registrados: ${totalVotes}`);
    
    // Obter estatísticas dos eleitores para o método Helios
    const voterStats = await config.contract.getVoterStats();
    const maxPossibleVotes = BigInt(voterStats.totalAuthorized);
    
    console.log(`Total de eleitores autorizados: ${maxPossibleVotes}`);
    
    // Obter parâmetros ElGamal diretamente do contrato
    const elgamalFromContract = await config.contract.getElGamalParameters();
    const elgamalParams = {
        p: BigInt(elgamalFromContract.prime),
        g: BigInt(elgamalFromContract.generator),
        h: BigInt(elgamalFromContract.publicKey)
    };
    
    // Verificar se os resultados já foram publicados no contrato
    const votingStatus = await config.contract.getVotingStatus();
    
    if (votingStatus.hasResults) {
        console.log("\n✅ Resultados já publicados no contrato!");
        console.log("\n🔍 Buscando resultados finais do contrato...");
        
        const results = [];
        for (let i = 0; i < config.candidateNames.length; i++) {
            const candidateData = await config.contract.getCandidate(i);
            results.push({
                candidate: candidateData.name,
                votes: candidateData.voteCount.toString()
            });
            console.log(`  ${candidateData.name}: ${candidateData.voteCount} votos`);
        }
        
        const winner = await config.contract.getWinnerName();
        console.log(`\n🏆 Vencedor: ${winner}`);
        
        console.log("\n📊 ESTATÍSTICAS DE PARTICIPAÇÃO:");
        console.log(`  Total autorizado: ${voterStats.totalAuthorized} eleitores`);
        console.log(`  Total que votou: ${voterStats.totalVoted} eleitores`);
        console.log(`  Participação: ${voterStats.participationPercentage}%`);
        
        const finalResults = {
            timestamp: new Date().toISOString(),
            votingEnded: true,
            resultsPublished: true,
            totalVotes: totalVotes.toString(),
            results: results,
            winner: winner,
            participation: {
                authorized: voterStats.totalAuthorized.toString(),
                voted: voterStats.totalVoted.toString(),
                percentage: voterStats.participationPercentage.toString()
            }
        };
        
        fs.writeFileSync('election-results.json', JSON.stringify(finalResults, null, 2));
        console.log("\n💾 Resultados salvos em 'election-results.json'");
        return finalResults;
    }
    
    // Se não há resultados publicados, buscar e processar votos
    console.log("\n📥 Coletando votos cifrados da blockchain...");
    
    // Decidir estratégia baseado no número de votos
    let votes = [];
    
    // Usar getAllEncryptedVotes para buscar todos de uma vez
    console.log("  Coletando todos os votos de uma vez...");

    const allEncryptedVotes = await config.contract.getAllEncryptedVotes();

    for (let i = 0; i < allEncryptedVotes.length; i++) {
        const voteData = allEncryptedVotes[i];
        const vote = [];
        
        for (let j = 0; j < config.candidateNames.length; j++) {
            vote.push({
                c1: BigInt(voteData.c1_values[j]),
                c2: BigInt(voteData.c2_values[j])
            });
        }
        votes.push(vote);
        
        if ((i + 1) % 10 === 0) {
            console.log(`  Processados ${i + 1}/${totalVotes} votos...`);
        }
    }
    console.log(`  ✓ Todos os ${totalVotes} votos coletados`);
    
    // Realizar agregação homomórfica
    const aggregated = await homomorphicAggregation(
        votes, 
        elgamalParams, 
        config.candidateNames
    );
    
    // Verificar se temos a chave privada para decifrar
    const privateKeyFromEnv = process.env.ELGAMAL_PRIVATE_KEY;
    
    if (!privateKeyFromEnv) {
        console.log("\n⌛ Aguardando publicação dos resultados pelo administrador...");
        console.log("   Os votos foram agregados mas a chave privada não está disponível");
        
        // Salvar resultados agregados cifrados
        const encryptedResults = {
            timestamp: new Date().toISOString(),
            votingEnded: true,
            totalVotes: totalVotes.toString(),
            aggregatedEncrypted: aggregated.map(item => ({
                candidate: item.candidate,
                c1: item.c1.toString(),
                c2: item.c2.toString()
            })),
            participation: {
                authorized: voterStats.totalAuthorized.toString(),
                voted: totalVotes.toString(),
                percentage: voterStats.participationPercentage.toString()
            }
        };
        
        fs.writeFileSync('encrypted-results.json', JSON.stringify(encryptedResults, null, 2));
        console.log("\n💾 Resultados agregados cifrados salvos em 'encrypted-results.json'");
        return encryptedResults;
    }
    
    // Adicionar chave privada aos parâmetros
    elgamalParams.x = BigInt(privateKeyFromEnv);
    console.log("✓ Chave privada carregada do arquivo .env");
    
    // Decifrar resultados agregados usando método Helios
    const results = await decryptAggregatedResults(
        aggregated, 
        elgamalParams, 
        maxPossibleVotes  // Usa número de eleitores, não total de votos
    );
    
    // Salvar resultados finais
    const finalResults = {
        timestamp: new Date().toISOString(),
        votingEnded: true,
        totalVotes: totalVotes.toString(),
        results: results.map(r => ({
            candidate: r.candidate,
            votes: r.votes.toString(),
            verified: r.proofValid
        })),
        participation: {
            authorized: voterStats.totalAuthorized.toString(),
            voted: voterStats.totalVoted.toString(),
            percentage: voterStats.participationPercentage.toString()
        },
        decodingMethod: "Helios-style (Baby-step Giant-step)"
    };
    
    fs.writeFileSync('election-results.json', JSON.stringify(finalResults, null, 2));
    
    console.log("\n========== RESULTADO FINAL DA ELEIÇÃO ==========");
    results.forEach(r => {
        console.log(`${r.candidate}: ${r.votes} votos ${r.proofValid ? '✓' : '⚠️'}`);
    });
    
    console.log("\n📊 ESTATÍSTICAS DE PARTICIPAÇÃO:");
    console.log(`  Eleitores autorizados: ${voterStats.totalAuthorized}`);
    console.log(`  Votos registrados: ${voterStats.totalVoted}`);
    console.log(`  Taxa de participação: ${voterStats.participationPercentage}%`);
    
    // Determinar vencedor
    const winner = results.reduce((prev, current) => 
        (current.votes > prev.votes) ? current : prev
    );
    
    console.log(`\n🏆 VENCEDOR: ${winner.candidate} com ${winner.votes} votos!`);
    
    console.log("\n💾 Resultados salvos em 'election-results.json'");
    console.log("📝 Método de decodificação: Helios-style (Baby-step Giant-step)");
    
    return finalResults;
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function main() {
    try {
        console.log("================================================");
        console.log("   VERIFICAÇÃO DE ELEIÇÃO ELGAMAL");
        console.log("   Sistema Estilo Helios com Baby-step Giant-step");
        console.log("================================================");
        
        // 1. Carregar configuração e conectar ao contrato
        const config = await getContractConfig();
        console.log(`\n📋 Contrato: ${config.contract.target}`);
        
        // 2. Obter status atualizado diretamente do contrato
        const votingStatus = await config.contract.getVotingStatus();
        const votingEnded = votingStatus.isEnded;
        const hasResults = votingStatus.hasResults;
        const totalVotes = votingStatus.totalVotes;
        
        // 3. Obter parâmetros ElGamal do contrato
        const elgamalParams = await config.contract.getElGamalParameters();
        
        console.log("\n📊 STATUS DO CONTRATO:");
        console.log(`  Votação encerrada: ${votingEnded ? 'SIM ✓' : 'NÃO ⏳'}`);
        console.log(`  Resultados publicados: ${hasResults ? 'SIM ✓' : 'NÃO ⏳'}`);
        console.log(`  Total de votos: ${totalVotes}`);
        console.log(`  Candidatos: ${config.candidateNames.join(', ')}`);
        console.log(`  Rede: ${config.network}`);
        
        console.log("\n🔑 PARÂMETROS ELGAMAL (públicos do contrato):");
        console.log(`  P: ${elgamalParams.prime.toString().substring(0, 40)}...`);
        console.log(`  G: ${elgamalParams.generator}`);
        console.log(`  H: ${elgamalParams.publicKey.toString().substring(0, 40)}...`);
        
        // 4. Verificar se foi passado um hash de transação como argumento
        const args = process.argv.slice(2);
        const txHashFromArgs = args.find(arg => arg.startsWith('0x') && arg.length === 66);

        // 5. Decidir fluxo baseado no status da votação
        if (votingEnded && hasResults) {
            console.log("\n✅ Votação encerrada com resultados publicados");
            await processElectionResults(config);
            
        } else if (votingEnded && !hasResults) {
            console.log("\n✅ Votação encerrada - aguardando publicação dos resultados");
            await processElectionResults(config);
            
        } else {
            console.log("\n⏳ Votação em andamento");
            
            // Mostrar estatísticas atuais
            const stats = await config.contract.getVoterStats();
            console.log("\n📊 PARTICIPAÇÃO ATUAL:");
            console.log(`  ${stats.totalVoted}/${stats.totalAuthorized} eleitores votaram (${stats.participationPercentage}%)`);
        }
        
        // 6. Sempre permitir busca por hash de transação (transparência total)
        console.log("\n🔍 BUSCA DE VOTOS");
        console.log("   Transparência total: consultas sempre permitidas");
        
        // Verificar se foi passado um hash como argumento
        let txHash = txHashFromArgs;
        
        if (!txHash && totalVotes > 0) {
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            const statusMsg = votingEnded ? 
                '\n📮 Digite o hash da transação para verificar (ou Enter para sair): ' :
                '\n🗳️ Votação em andamento. Digite o hash para verificar seu voto (ou Enter para sair): ';
            
            txHash = await new Promise(resolve => {
                rl.question(statusMsg, resolve);
            });
            rl.close();
        }
        
        if (txHash && txHash.length === 66) {
            try {
                const voteInfo = await searchVote(txHash, config);
                
                // Mensagem adicional baseada no status
                if (!votingEnded) {
                    console.log("\n✅ Seu voto foi registrado com sucesso!");
                    console.log("   Os valores estão criptografados e seguros.");
                    console.log("   Guarde o hash da transação como comprovante.");
                } else if (hasResults) {
                    console.log("\n✅ Voto verificado! Os resultados finais já foram publicados.");
                }
                
            } catch (error) {
                console.error(`\n⚠️ ERRO: ${error.message}`);
                
                // Sugestão de ajuda baseada no erro
                if (error.message.includes("não encontrada")) {
                    console.error("   Verifique se o hash está correto e se a transação foi confirmada.");
                } else if (error.message.includes("não é um voto")) {
                    console.error("   Esta transação existe mas não é um voto válido nesta eleição.");
                }
            }
        } else if (txHash) {
            console.error("\n⚠️ ERRO: Hash de transação inválido");
            console.error("   Um hash válido deve ter 66 caracteres (0x + 64 hex)");
            console.error("   Exemplo: 0x1234567890abcdef...");
        } else if (totalVotes === 0) {
            console.log("\n📭 Nenhum voto registrado ainda nesta eleição.");
        }
        
        console.log("\n================================================");
        console.log("         VERIFICAÇÃO CONCLUÍDA");
        console.log("================================================\n");
        
    } catch (error) {
        console.error("⚠️ Erro:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { 
    searchVote, 
    processElectionResults
};