// test-elgamal-voting.js
// Script completo para testar votação com ElGamal
// Execução: npx hardhat run scripts/test-elgamal-voting.js --network poa

const hre = require("hardhat");

// ==================== CONFIGURAÇÕES ELGAMAL ====================
// Usando valores pequenos para facilitar verificação manual
const ELGAMAL_PARAMS = {
    p: 2147483647n,  // Primo de Mersenne (2^31 - 1)
    g: 3n,           // Gerador primitivo
    x: 1234567890n,  // Chave privada maior
    // h será calculado: g^x mod p
};

// ==================== FUNÇÕES MATEMÁTICAS ====================

// Função para calcular exponenciação modular
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

// Função para calcular o inverso modular usando algoritmo estendido de Euclides
function modInverse(a, m) {
    let m0 = m;
    let x0 = 0n;
    let x1 = 1n;
    
    if (m === 1n) return 0n;
    
    while (a > 1n) {
        let q = a / m;
        let t = m;
        m = a % m;
        a = t;
        t = x0;
        x0 = x1 - q * x0;
        x1 = t;
    }
    
    if (x1 < 0n) x1 += m0;
    
    return x1;
}

// ==================== PROTOCOLO CHAUM-PEDERSEN ====================

const crypto = require('crypto');

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
    const h = modPow(ELGAMAL_PARAMS.g, ELGAMAL_PARAMS.x, ELGAMAL_PARAMS.p);
    
    console.log("\n========== GERAÇÃO DE CHAVES ELGAMAL ==========");
    console.log("Parâmetros públicos:");
    console.log(`  P (primo): ${ELGAMAL_PARAMS.p}`);
    console.log(`  G (gerador): ${ELGAMAL_PARAMS.g}`);
    console.log(`  H (chave pública): ${h}`);
    console.log(`    Cálculo: H = G^X mod P = ${ELGAMAL_PARAMS.g}^${ELGAMAL_PARAMS.x} mod ${ELGAMAL_PARAMS.p} = ${h}`);
    console.log("\nChave privada (SECRETA!):");
    console.log(`  X: ${ELGAMAL_PARAMS.x}`);
    
    return { p: ELGAMAL_PARAMS.p, g: ELGAMAL_PARAMS.g, h, x: ELGAMAL_PARAMS.x };
}

// Cifra um voto usando ElGamal
function encryptVote(vote, publicKey, voterName, r) {
    console.log(`\n--- Cifrando voto de ${voterName} ---`);
    console.log(`Voto original: Candidato 1 = ${vote[0]}, Candidato 2 = ${vote[1]}`);
    console.log(`R (aleatório para este voto): ${r}`);
    
    const result = [];
    
    for (let i = 0; i < vote.length; i++) {
        const m = BigInt(vote[i]);
        
        // C1 = G^R mod P
        const c1 = modPow(publicKey.g, r, publicKey.p);
        
        // C2 = H^R * G^M mod P
        const h_r = modPow(publicKey.h, r, publicKey.p);
        const g_m = modPow(publicKey.g, m, publicKey.p);
        const c2 = (h_r * g_m) % publicKey.p;
        
        console.log(`\nCandidato ${i + 1}:`);
        console.log(`  M = ${m}`);
        console.log(`  C1 = G^R mod P = ${publicKey.g}^${r} mod ${publicKey.p} = ${c1}`);
        console.log(`  C2 = H^R * G^M mod P`);
        console.log(`     H^R = ${publicKey.h}^${r} mod ${publicKey.p} = ${h_r}`);
        console.log(`     G^M = ${publicKey.g}^${m} mod ${publicKey.p} = ${g_m}`);
        console.log(`     C2 = ${h_r} * ${g_m} mod ${publicKey.p} = ${c2}`);
        
        result.push({ c1, c2 });
    }
    
    return result;
}

// Agrega votos cifrados (multiplicação homomórfica)
function aggregateEncryptedVotes(encryptedVotes, publicKey) {
    console.log("\n========== AGREGAÇÃO HOMOMÓRFICA DOS VOTOS ==========");
    
    const numCandidates = encryptedVotes[0].length;
    const aggregated = [];
    
    for (let candidateIdx = 0; candidateIdx < numCandidates; candidateIdx++) {
        let c1_product = 1n;
        let c2_product = 1n;
        
        console.log(`\nCandidato ${candidateIdx + 1}:`);
        
        for (let voterIdx = 0; voterIdx < encryptedVotes.length; voterIdx++) {
            const vote = encryptedVotes[voterIdx][candidateIdx];
            c1_product = (c1_product * vote.c1) % publicKey.p;
            c2_product = (c2_product * vote.c2) % publicKey.p;
            
            console.log(`  Após voto ${voterIdx + 1}: C1_agg = ${c1_product}, C2_agg = ${c2_product}`);
        }
        
        aggregated.push({ c1: c1_product, c2: c2_product });
        
        console.log(`\nResultado agregado para Candidato ${candidateIdx + 1}:`);
        console.log(`  C1_final = ${c1_product}`);
        console.log(`  C2_final = ${c2_product}`);
    }
    
    return aggregated;
}

// Decifra votos agregados
function decryptAggregatedVotes(aggregatedVotes, privateKey, publicKey) {
    console.log("\n========== DECIFRAÇÃO DOS VOTOS AGREGADOS ==========");
    
    const results = [];
    
    for (let i = 0; i < aggregatedVotes.length; i++) {
        const { c1, c2 } = aggregatedVotes[i];
        
        console.log(`\nCandidato ${i + 1}:`);
        console.log(`  C1 = ${c1}, C2 = ${c2}`);
        
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
            candidato: i + 1,
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
    
    // 1. Gerar chaves ElGamal
    const keys = generateElGamalKeys();
    
    // 2. Deploy do contrato
    console.log("\n========== DEPLOY DO CONTRATO ==========");
    const ElGamalVoting = await hre.ethers.getContractFactory("ElGamalVoting");
    const contract = await ElGamalVoting.deploy(keys.p, keys.g, keys.h);
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    console.log(`Contrato deployado em: ${contractAddress}`);
    
    // 3. Configurar eleitores
    const [deployer, voter1, voter2, voter3] = await hre.ethers.getSigners();
    
    console.log("\n========== ELEITORES ==========");
    console.log(`Eleitor 1: ${voter1.address}`);
    console.log(`Eleitor 2: ${voter2.address}`);
    console.log(`Eleitor 3: ${voter3.address}`);
    
    // 4. Simular votos
    // Criar função auxiliar
    function generateSecureRandom(p, voterName = "") {
    const r = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % (p - 2n) + 1n;
    console.log(`  🎲 R gerado para ${voterName}: ${r}`);
    return r;
    }

    // Usar assim:
    const votes = [
        { 
            voter: voter1, 
            vote: [0, 1], 
            name: "Eleitor 1", 
            r: generateSecureRandom(ELGAMAL_PARAMS.p, "Eleitor 1") 
        },
        { 
            voter: voter2, 
            vote: [0, 1], 
            name: "Eleitor 2", 
            r: generateSecureRandom(ELGAMAL_PARAMS.p, "Eleitor 2") 
        },
        { 
            voter: voter3, 
            vote: [0, 1], 
            name: "Eleitor 3", 
            r: generateSecureRandom(ELGAMAL_PARAMS.p, "Eleitor 3") 
        }
    ];
    
    console.log("\n========== PROCESSO DE VOTAÇÃO ==========");
    console.log("Votos em claro (para verificação):");
    votes.forEach(v => {
        console.log(`  ${v.name}: Candidato 1 = ${v.vote[0]}, Candidato 2 = ${v.vote[1]}`);
    });
    
    // 5. Cifrar e enviar votos
    const encryptedVotes = [];
    
    for (const voteData of votes) {
        // Cifrar voto
        const encrypted = encryptVote(voteData.vote, keys, voteData.name, voteData.r);
        encryptedVotes.push(encrypted);
        
        // Enviar para blockchain
        console.log(`\nEnviando voto cifrado de ${voteData.name} para blockchain...`);
        const tx = await contract.connect(voteData.voter).submitEncryptedVote(
            encrypted[0].c1,
            encrypted[0].c2,
            encrypted[1].c1,
            encrypted[1].c2
        );
        await tx.wait();
        console.log(`✓ Voto registrado na blockchain!`);
    }
    
    // 6. Buscar votos da blockchain
    console.log("\n========== VERIFICAÇÃO DOS VOTOS NA BLOCKCHAIN ==========");
    const totalVotes = await contract.getTotalVotes();
    console.log(`Total de votos registrados: ${totalVotes}`);
    
    const votesFromBlockchain = [];
    for (let i = 0; i < totalVotes; i++) {
        const vote = await contract.getVote(i);
        console.log(`\nVoto ${i + 1}:`);
        console.log(`  Eleitor: ${vote[4]}`);
        console.log(`  Candidato 1: C1=${vote[0]}, C2=${vote[1]}`);
        console.log(`  Candidato 2: C1=${vote[2]}, C2=${vote[3]}`);
        
        votesFromBlockchain.push([
            { c1: BigInt(vote[0]), c2: BigInt(vote[1]) },
            { c1: BigInt(vote[2]), c2: BigInt(vote[3]) }
        ]);
    }
    
    // 7. Agregar votos (off-chain)
    const aggregated = aggregateEncryptedVotes(votesFromBlockchain, keys);
    
    // 8. Decifrar resultado
    const results = decryptAggregatedVotes(aggregated, keys, keys);
    
    // 9. Exibir resultado final
    console.log("\n========== RESULTADO FINAL DA ELEIÇÃO ==========");
    console.log(`Candidato 1: ${results[0]} votos`);
    console.log(`Candidato 2: ${results[1]} votos`);
    
    // Verificação
    const expectedCandidate1 = votes.filter(v => v.vote[0] === 1).length;
    const expectedCandidate2 = votes.filter(v => v.vote[1] === 1).length;
    
    console.log("\n========== VERIFICAÇÃO ==========");
    console.log(`Esperado - Candidato 1: ${expectedCandidate1} votos`);
    console.log(`Esperado - Candidato 2: ${expectedCandidate2} votos`);
    console.log(`Resultado correto: ${results[0] == expectedCandidate1 && results[1] == expectedCandidate2 ? '✓ SIM' : '✗ NÃO'}`);
    
    console.log("\n================================================");
    console.log("     TESTE CONCLUÍDO COM SUCESSO!");
    console.log("================================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });