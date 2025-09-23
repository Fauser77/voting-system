const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { loadElGamalParams } = require('./elgamal-utils');

function loadElectionConfig() {
    const configFile = path.join(__dirname, 'election-config.json');    

    if (!fs.existsSync(configFile)) {
        console.error("❌ Arquivo election-config.json não encontrado!");
        console.log("   Crie um arquivo com a estrutura:");
        console.log("   {");
        console.log('     "candidateNames": ["Nome1", "Nome2", ...],');
        console.log('     "authorizedVoters": ["0x...", "0x...", ...],');
        console.log('     "authorizedRelayers": ["0x...", ...]');
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
    
    if (!config.authorizedRelayers || config.authorizedRelayers.length === 0) {
        console.log("⚠️  Nenhum relayer definido no arquivo");
    }
    
    return config;
}

async function main() {
    console.log("=== Deploy do Contrato de Votação ElGamal ===\n");
    
    const params = loadElGamalParams();
    console.log("📊 Parâmetros ElGamal:");
    console.log(`   P (${params.bits} bits): ${params.p.toString().substring(0, 40)}...`);
    console.log(`   G (gerador): ${params.g}`);
    console.log(`   H (chave pública): ${params.h.toString().substring(0, 40)}...`);
    console.log(`   Gerados em: ${params.generated}\n`);
    
    const electionConfig = loadElectionConfig();
    const candidateNames = electionConfig.candidateNames;
    const authorizedVoters = electionConfig.authorizedVoters;
    const authorizedRelayers = electionConfig.authorizedRelayers;
    
    // Pega as contas do hardhat, apenas Admin e Relayers
    const accounts = await hre.ethers.getSigners();
    
    // Admin será a primeira conta
    const admin = accounts[0];
    
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
        authorizedVoters,
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
    console.log(`   Total que votou: ${voterStats.totalVoted}`);
    console.log(`   Participação: ${voterStats.participationPercentage}%`);
    
    const deployData = {
        contract: contractAddress,
        network: hre.network.name,
        admin: admin.address,
        candidateNames: candidateNames,
        authorizedVoters: authorizedVoters,
        authorizedRelayers: authorizedRelayers,
        elgamalParams: {
            p: params.p.toString(),
            g: params.g.toString(),
            h: params.h.toString(),
            bits: params.bits
        },
        deployedAt: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber(),
        configFile: 'election-config.json'
    };
    
    fs.writeFileSync('deploy-info.json', JSON.stringify(deployData, null, 2));
    console.log("\n💾 Informações do deploy salvas em 'deploy-info.json'");
    
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