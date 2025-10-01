const hre = require("hardhat");
const { loadElGamalParams, modPow, modInverse } = require('./elgamal-utils');
const crypto = require('crypto');

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Carregar parâmetros do arquivo
const ELGAMAL_PARAMS = loadElGamalParams();

// ==================== PROTOCOLO CHAUM-PEDERSEN ====================

function generateDecryptionProof(c1, c2, decryptedValue, x, g, h, p) {
    console.log("\n  Gerando Prova Chaum-Pedersen...");
    
    // Gerar valor aleatório w
    const w = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % (p - 1n);
    
    // Calcular compromissos
    const a = modPow(g, w, p);  // a = g^w
    const b = modPow(c1, w, p); // b = c1^w
    
    // Calcular challenge (hash)
    const challengeInput = `${c1},${c2},${decryptedValue},${a},${b}`;
    const challengeHash = crypto.createHash('sha256').update(challengeInput).digest('hex');
    const e = BigInt('0x' + challengeHash) % (p - 1n);
    
    // Calcular resposta
    const s = (w + e * x) % (p - 1n);
    
    return {
        commitment_a: a.toString(),
        commitment_b: b.toString(),
        challenge: e.toString(),
        response: s.toString(),
        decrypted_value: decryptedValue.toString()
    };
}

function verifyDecryptionProof(c1, c2, proof, g, h, p) {
    console.log("  Verificando prova...");
    
    const a = BigInt(proof.commitment_a);
    const b = BigInt(proof.commitment_b);
    const e = BigInt(proof.challenge);
    const s = BigInt(proof.response);
    const m = BigInt(proof.decrypted_value);
    
    // Recalcular o challenge
    const challengeInput = `${c1},${c2},${m},${a},${b}`;
    const challengeHash = crypto.createHash('sha256').update(challengeInput).digest('hex');
    const e_verify = BigInt('0x' + challengeHash) % (p - 1n);
    
    if (e !== e_verify) return false;
    
    // Verificar equações
    const left1 = modPow(g, s, p);
    const right1 = (a * modPow(h, e, p)) % p;
    
    const left2 = modPow(c1, s, p);
    const c2_div_m = (c2 * modInverse(m, p)) % p;
    const right2 = (b * modPow(c2_div_m, e, p)) % p;
    
    return (left1 === right1) && (left2 === right2);
}

// Função auxiliar para encontrar contagem de votos
function findVoteCount(g, target, p, maxVotes = 1000n) {
    let current = 1n;
    for (let i = 0n; i <= maxVotes; i++) {
        if (current === target) return i;
        current = (current * g) % p;
    }
    return null;
}

// ==================== FUNÇÕES ELGAMAL ====================

// Gera as chaves ElGamal
function generateElGamalKeys() {
    console.log("\n========== PARÂMETROS ELGAMAL CARREGADOS ==========");
    console.log("Parâmetros públicos:");
    console.log(`  P (${ELGAMAL_PARAMS.bits} bits): ${ELGAMAL_PARAMS.p.toString().substring(0, 50)}...`);
    console.log(`  G (gerador): ${ELGAMAL_PARAMS.g}`);
    console.log(`  H (chave pública): ${ELGAMAL_PARAMS.h.toString().substring(0, 50)}...`);
    console.log(`  Gerados em: ${ELGAMAL_PARAMS.generated}`);
    console.log("\nChave privada (SECRETA!):");
    console.log(`  X: ${ELGAMAL_PARAMS.x.toString().substring(0, 50)}...`);
    
    return ELGAMAL_PARAMS;
}

// Cifra um voto usando ElGamal
function encryptVote(vote, publicKey, voterName, rValues, candidateNames) {
    console.log(`\n--- Cifrando voto de ${voterName} ---`);
    console.log(`Voto: ${vote.map((v, i) => `${candidateNames[i]}=${v}`).join(', ')}`);
    
    const result = [];
    
    for (let i = 0; i < vote.length; i++) {
        const m = BigInt(vote[i]);
        const r = rValues[i];
        
        // C1 = G^R mod P
        const c1 = modPow(publicKey.g, r, publicKey.p);
        
        // C2 = H^R * G^M mod P
        const h_r = modPow(publicKey.h, r, publicKey.p);
        const g_m = modPow(publicKey.g, m, publicKey.p);
        const c2 = (h_r * g_m) % publicKey.p;
        
        console.log(`\n${candidateNames[i]}:`);
        console.log(`  R = ${r.toString().substring(0,20)}`);
        console.log(`  M = ${m}`);
        console.log(`  C1 = G^R mod P = ${publicKey.g}^${r} mod ${publicKey.p} = ${c1.toString().substring(0,20)}`);
        console.log(`  C2 = H^R * G^M mod P`);
        console.log(`     H^R = ${publicKey.h}^${r} mod ${publicKey.p} = ${h_r}`);
        console.log(`     G^M = ${publicKey.g}^${m} mod ${publicKey.p} = ${g_m}`);
        console.log(`     C2 = ${h_r} * ${g_m} mod ${publicKey.p} = ${c2.toString().substring(0,20)}`);
        
        result.push({ c1, c2 });
    }
    
    return result;
}

// Agrega votos cifrados (multiplicação homomórfica)
function aggregateEncryptedVotes(encryptedVotes, publicKey, candidateNames) {
    console.log("\n========== AGREGAÇÃO HOMOMÓRFICA DOS VOTOS ==========");
    
    const numCandidates = encryptedVotes[0].length;
    const aggregated = [];
    
    for (let candidateIdx = 0; candidateIdx < numCandidates; candidateIdx++) {
        let c1_product = 1n;
        let c2_product = 1n;
        
        console.log(`\n${candidateNames[candidateIdx]}:`);
        
        for (let voterIdx = 0; voterIdx < encryptedVotes.length; voterIdx++) {
            const vote = encryptedVotes[voterIdx][candidateIdx];
            c1_product = (c1_product * vote.c1) % publicKey.p;
            c2_product = (c2_product * vote.c2) % publicKey.p;
            
            console.log(`  Após voto ${voterIdx + 1}: C1_agg = ${c1_product}, C2_agg = ${c2_product}`);
        }
        
        aggregated.push({ c1: c1_product, c2: c2_product });  
        console.log(`  C1_final = ${c1_product.toString().substring(0,30)}...`);
        console.log(`  C2_final = ${c2_product.toString().substring(0,30)}...`);
    }
    
    return aggregated;
}

// Decifra votos agregados
function decryptAggregatedVotes(aggregatedVotes, privateKey, publicKey, candidateNames) {
    console.log("\n========== DECIFRAÇÃO DOS VOTOS AGREGADOS ==========");
    
    const results = [];
    
    for (let i = 0; i < aggregatedVotes.length; i++) {
        const { c1, c2 } = aggregatedVotes[i];
        
        console.log(`\n${candidateNames[i]}:`);
        
        // Passo 1: Decifrar
        // M' = C2 * (C1^X)^-1 mod P
        const c1_x = modPow(c1, privateKey.x, publicKey.p);
        console.log(`  C1^X = ${c1}^${privateKey.x} mod ${publicKey.p} = ${c1_x}`);
        
        const c1_x_inv = modInverse(c1_x, publicKey.p);
        console.log(`  (C1^X)^-1 = ${c1_x_inv}`);
        console.log(`    Verificação: ${c1_x} * ${c1_x_inv} mod ${publicKey.p} = ${(c1_x * c1_x_inv) % publicKey.p}`);
        
        const m_prime = (c2 * c1_x_inv) % publicKey.p;
        console.log(`  M' = C2 * (C1^X)^-1 = ${c2} * ${c1_x_inv} mod ${publicKey.p} = ${m_prime}`);
        
        // Passo 2: Encontrar contagem de votos
        const voteCount = findVoteCount(publicKey.g, m_prime, publicKey.p);
        console.log(`  Votos encontrados: ${voteCount}`);
        
        // Passo 3: Gerar prova Chaum-Pedersen
        const proof = generateDecryptionProof(
            c1,
            c2,
            m_prime,
            privateKey.x,
            publicKey.g,
            publicKey.h,
            publicKey.p
        );
        
        console.log(`  Prova Chaum-Pedersen gerada:`);
        console.log(`    a (g^w): ${proof.commitment_a}`);
        console.log(`    b (c1^w): ${proof.commitment_b}`);
        console.log(`    e (challenge): ${proof.challenge}`);
        console.log(`    s (response): ${proof.response}`);
        
        // Passo 4: Verificar a prova
        const isValid = verifyDecryptionProof(
            c1,
            c2,
            proof,
            publicKey.g,
            publicKey.h,
            publicKey.p
        );
        
        console.log(`  Prova válida: ${isValid ? '✅ SIM' : '❌ NÃO'}`);
        
        // Adicionar ao resultado
        results.push({
            candidato: candidateNames[i],
            votos: voteCount,
            prova: proof,
            valida: isValid
        });
    }
    
    // Retornar apenas a contagem de votos (compatibilidade)
    return results.map(r => r.votos);
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function main() {
    console.log("================================================");
    console.log("     TESTE DE VOTAÇÃO COM ELGAMAL");
    console.log("================================================");
    
    // 1. Configurar candidatos dinamicamente
    console.log("\n========== CONFIGURAÇÃO DOS CANDIDATOS ==========");
    const numCandidatesStr = await question("Quantos candidatos? ");
    const numCandidates = parseInt(numCandidatesStr);
    
    const candidateNames = [];
    for (let i = 0; i < numCandidates; i++) {
        const name = await question(`Nome do candidato ${i + 1}: `);
        candidateNames.push(name);
    }
    
    console.log("\nCandidatos registrados:");
    candidateNames.forEach((name, idx) => console.log(`  ${idx + 1}. ${name}`));
    
    // 2. Gerar chaves ElGamal
    const keys = generateElGamalKeys();
    
    // 3. Deploy do contrato com candidatos
    console.log("\n========== DEPLOY DO CONTRATO ==========");
    const ElGamalVoting = await hre.ethers.getContractFactory("ElGamalVoting");
    const contract = await ElGamalVoting.deploy(keys.p, keys.g, keys.h, candidateNames);
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log(`Contrato deployado em: ${contractAddress}`);
    
    // 4. Configurar relayer e eleitores
    const signers = await hre.ethers.getSigners();
    const admin = signers[0];
    const relayer = signers[1]; // Segunda conta como relayer
    const voters = signers.slice(2, 12); // Próximas 10 contas (índices 2-11)
    
    console.log("\n========== CONFIGURANDO RELAYER ==========");
    console.log(`Admin: ${admin.address}`);
    console.log(`Relayer: ${relayer.address}`);
    
    // Autorizar relayer
    await contract.connect(admin).authorizeRelayer(relayer.address);
    console.log("✓ Relayer autorizado!");
    
    // 5. Exibir eleitores
    console.log(`\n========== ${voters.length} ELEITORES ==========`);
    voters.forEach((voter, i) => {
        console.log(`Eleitor ${i + 1}: ${voter.address}`);
    });
    
    // 6. Processo de votação
    console.log("\n========== COLETA DE VOTOS ==========");
    console.log("Instruções: Digite o número do candidato (1 a " + numCandidates + ")");
    
    const votes = [];
    const transactionHashes = [];
    const encryptedVotesForAggregation = [];
    
    for (let i = 0; i < voters.length; i++) {
        console.log(`\n--- Eleitor ${i + 1} (${voters[i].address.substring(0,10)}...) ---`);
        const voteChoice = await question(`Vote no candidato (1-${numCandidates}): `);
        const candidateIdx = parseInt(voteChoice) - 1;
        
        if (candidateIdx < 0 || candidateIdx >= numCandidates) {
            console.log("❌ Voto inválido! Pulando eleitor...");
            continue;
        }
        
        // Criar array de voto (0 para todos, 1 para o escolhido)
        const voteArray = new Array(numCandidates).fill(0);
        voteArray[candidateIdx] = 1;
        
        // Gerar R aleatório para este eleitor e candidato
        const rValues = [];
        for (let j = 0; j < numCandidates; j++) {
            rValues.push(generateSecureRandom(keys.p, `Eleitor ${i + 1} - ${candidateNames[j]}`));
        }
        
        // Cifrar voto
        const encrypted = encryptVote(voteArray, keys, `Eleitor ${i + 1}`, rValues, candidateNames);

        encryptedVotesForAggregation.push(encrypted);
        
        // Preparar arrays para o contrato
        const c1_values = encrypted.map(e => e.c1);
        const c2_values = encrypted.map(e => e.c2);
        
        // Enviar via relayer (mascarando endereço real)
        console.log(`Enviando voto via relayer...`);
        const tx = await contract.connect(relayer).submitEncryptedVote(
            c1_values,
            c2_values,
            voters[i].address // Endereço real do eleitor (será mascarado on-chain)
        );
        
        const receipt = await tx.wait();
        console.log(`✓ Voto registrado!`);
        console.log(`  Hash da transação: ${receipt.hash}`);
        console.log(`  Bloco: ${receipt.blockNumber}`);
        
        transactionHashes.push(receipt.hash);
        
        votes.push({
            eleitor: i + 1,
            endereço: voters[i].address,
            candidato: candidateNames[candidateIdx],
            voteArray,
            txHash: receipt.hash
        });
    }
    
    // 7. Salvar informações para o monitor
    const monitorData = {
        contractAddress,
        transactionHashes,
        candidateNames,
        totalVoters: voters.length,
        timestamp: new Date().toISOString()
    };
    
    const fs = require('fs');
    fs.writeFileSync('voting-transactions.json', JSON.stringify(monitorData, null, 2));
    console.log("\n✓ Hashes das transações salvos em voting-transactions.json");
    console.log("  Use o monitor-elgamal-votes.js passando um hash para verificar");
    
    // 8. Buscar votos da blockchain e agregar
    console.log("\n========== VERIFICAÇÃO DOS VOTOS NA BLOCKCHAIN ==========");
    const totalVotesOnChain = await contract.getTotalVotes();
    console.log(`Total de votos registrados: ${totalVotesOnChain}`);
    
    // Coletar votos da blockchain para agregação
    const votesFromBlockchain = [];
    for (let i = 0; i < totalVotesOnChain; i++) {
        const vote = await contract.getVote(i);
        const voteData = [];
        for (let j = 0; j < numCandidates; j++) {
            voteData.push({
                c1: BigInt(vote[0][j]),
                c2: BigInt(vote[1][j])
            });
        }
        votesFromBlockchain.push(voteData);
    }
    
    // 9. Agregar e decifrar
    const aggregated = aggregateEncryptedVotes(votesFromBlockchain, keys, candidateNames);
    const results = decryptAggregatedVotes(aggregated, keys, keys, candidateNames);
    
    // 10. Exibir resultado final
    console.log("\n========== RESULTADO FINAL DA ELEIÇÃO ==========");
    candidateNames.forEach((name, idx) => {
        console.log(`${name}: ${results[idx]} votos`);
    });
    
    // Verificação
    console.log("\n========== VERIFICAÇÃO ==========");
    const voteCounts = new Array(numCandidates).fill(0);
    votes.forEach(v => {
        const idx = candidateNames.indexOf(v.candidato);
        if (idx !== -1) voteCounts[idx]++;
    });
    
    console.log("Esperado:");
    candidateNames.forEach((name, idx) => {
        console.log(`  ${name}: ${voteCounts[idx]} votos`);
    });
    
    const correct = results.every((r, i) => r === BigInt(voteCounts[i]));
    console.log(`\nResultado correto: ${correct ? '✅ SIM' : '❌ NÃO'}`);
    
    console.log("\n========== INSTRUÇÕES PARA VERIFICAÇÃO ==========");
    console.log("Para verificar uma transação específica, execute:");
    console.log("  npx hardhat run scripts/monitor-elgamal-votes.js --network poa");
    console.log("E escolha a opção 2 para buscar por hash");
    console.log("\nHashes disponíveis:");
    transactionHashes.forEach((hash, i) => {
        console.log(`  Eleitor ${i + 1}: ${hash}`);
    });
    
    rl.close();
    
    console.log("\n================================================");
    console.log("     TESTE CONCLUÍDO COM SUCESSO!");
    console.log("================================================");
}

function generateSecureRandom(p, voterName = "") {
    const r = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % (p - 2n) + 1n;
    console.log(`  🎲 R gerado para ${voterName}: ${r.toString().substring(0, 30)}...`);
    return r;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });