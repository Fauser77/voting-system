const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

function loadElectionConfig() {
    const configFile = path.join(__dirname, '..', '..', 'config', 'election-config.json');

    if (!fs.existsSync(configFile)) {
        console.error("❌ Arquivo election-config.json não encontrado!");
        console.log("   Crie um arquivo com a estrutura:");
        console.log("   {");
        console.log('     "candidateNames": ["Nome1", "Nome2", ...],');
        console.log('     "authorizedVoters": ["0x...", "0x...", ...],');
        console.log("   }");
        process.exit(1);
    }
    
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    
    if (!config.candidateNames || config.candidateNames.length === 0) {
        console.error("❌ Lista de candidatos vazia ou inexistente!");
        process.exit(1);
    }
    
    if (!config.authorizedVoters || config.authorizedVoters.length === 0) {
        console.log("⚠️  Nenhum eleitor definido no arquivo");
    }
    
    return config;
}

async function loadElGamalParams() {
    const paramsFile = path.join(__dirname, '..', '..', 'config', 'elgamal-params.json');
    
    if (!fs.existsSync(paramsFile)) {
        console.error("❌ Arquivo elgamal-params.json não encontrado!");
        console.log("   Execute primeiro: node scripts/elgamal-params-generator.js");
        process.exit(1);
    }
    
    const params = JSON.parse(fs.readFileSync(paramsFile, 'utf8'));
    
    // Converter strings para BigInt
    const localParams = {
        p: BigInt(params.p),
        g: BigInt(params.g),
        h: BigInt(params.h),
        generated: params.generated,
        bits: params.bits
    };
    console.log(localParams)
    return localParams;
}

async function main() {
    console.log("=== Deploy do Contrato de Votação ElGamal ===\n");
    
    const params = await loadElGamalParams();
    console.log("📊 Parâmetros ElGamal:");
    console.log(`   P (${params.bits} bits): ${params.p.toString().substring(0, 40)}...`);
    console.log(`   G (gerador): ${params.g}`);
    console.log(`   H (chave pública): ${params.h.toString().substring(0, 40)}...`);
    console.log(`   Gerados em: ${params.generated}\n`);
    
    const electionConfig = loadElectionConfig();
    const candidateNames = electionConfig.candidateNames;
    const authorizedVoters = electionConfig.authorizedVoters;
    
    // Pega as contas do hardhat, apenas Admin e Relayers
    const accounts = await hre.ethers.getSigners();
    
    // Admin será a primeira conta
    const admin = accounts[0];

    // Relayers serão as contas restantes 
    const authorizedRelayers = accounts.slice(1).map(account => account.address);
    
    console.log("🗳️  Configuração da Eleição:");
    console.log(`   Administrador: ${admin.address}`);
    console.log(`   Candidatos: ${candidateNames.length}`);
    candidateNames.forEach((name, idx) => 
        console.log(`     ${idx + 1}. ${name}`)
    );
    console.log(`\n   Eleitores autorizados: ${authorizedVoters.length}`);
    authorizedVoters.forEach((addr, idx) => 
        console.log(`     ${idx + 1}. ${addr}`)
    );
    console.log(`\n   Relayers autorizados: ${authorizedRelayers.length}`);
    authorizedRelayers.forEach((addr, idx) => 
        console.log(`     ${idx + 1}. ${addr}`)
    );
    
    console.log("\n📦 Iniciando deploy...");
    console.log(`   Deployer: ${admin.address}`);
    const balance = await admin.provider.getBalance(admin.address);
    console.log(`   Saldo: ${hre.ethers.formatEther(balance)} ETH`);
    
    const Ballot = await hre.ethers.getContractFactory("Ballot");
    const ballot = await Ballot.deploy(
        params.p.toString(),
        params.g.toString(), 
        params.h.toString(),
        candidateNames,
        authorizedRelayers
    );
    
    await ballot.waitForDeployment();
    const contractAddress = await ballot.getAddress();
    
    console.log(`\n✅ Contrato deployado com sucesso!`);
    console.log(`   Endereço: ${contractAddress}`);
    
    console.log("\n🔍 Verificando estado inicial:");
    const votingStatus = await ballot.getVotingStatus();
    console.log(`   Votação encerrada: ${votingStatus.isEnded}`);
    console.log(`   Resultados publicados: ${votingStatus.hasResults}`);
    console.log(`   Total de votos: ${votingStatus.totalVotes}`);
    console.log(`   Total de candidatos: ${votingStatus.totalCandidates}`);
    
    const voterStats = await ballot.getVoterStats();
    console.log(`\n📊 Estatísticas dos eleitores:`);
    console.log(`   Total autorizado: ${voterStats.totalAuthorized}`);
    
    // ==================== GERAR PUBLIC-CONFIG.JSON ====================
    const publicConfig = {
        contract: contractAddress,
        network: hre.network.name,
        candidateNames: candidateNames,
        numCandidates: candidateNames.length,
        elgamalParams: {
            p: params.p.toString(),
            g: params.g.toString(),
            h: params.h.toString(),
            bits: params.bits
        },
        votingStarted: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber(),
        chainId: 12345,
        rpcUrl: hre.network.config.url || "http://127.0.0.1:8545"
    };
    
    const publicConfigFile = path.join(__dirname, '..', '..', 'config', 'public-config.json');
    fs.writeFileSync(publicConfigFile, JSON.stringify(publicConfig, null, 2));
    console.log("\n💾 Configuração pública salva em 'blockchain/config/public-config.json'");
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DEPLOY CONCLUÍDO COM SUCESSO!");
    console.log("=".repeat(50));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Erro no deploy:", error);
        process.exit(1);
    });