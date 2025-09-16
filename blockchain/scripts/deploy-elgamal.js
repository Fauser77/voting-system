// deploy-elgamal.js
const hre = require("hardhat");
const fs = require('fs');
const { loadElGamalParams } = require('./elgamal-utils');

async function main() {
    console.log("=== Deploy do Contrato ElGamalVoting ===\n");
    
    // Carregar parâmetros do arquivo
    const params = loadElGamalParams();
    
    console.log("Parâmetros ElGamal carregados:");
    console.log(`  P (${params.bits} bits): ${params.p.toString().substring(0, 50)}...`);
    console.log(`  G (gerador): ${params.g}`);
    console.log(`  H (chave pública): ${params.h.toString().substring(0, 50)}...`);
    console.log(`  Gerados em: ${params.generated}\n`);
    
    // Definir candidatos padrão para o deploy
    const candidateNames = ["Candidato A", "Candidato B", "Candidato C"];
    console.log("Candidatos padrão para deploy:");
    candidateNames.forEach((name, idx) => console.log(`  ${idx + 1}. ${name}`));
    
    // Deploy
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\nDeploying com a conta: ${deployer.address}`);
    
    const ElGamalVoting = await hre.ethers.getContractFactory("ElGamalVoting");
    const contract = await ElGamalVoting.deploy(
        params.p, 
        params.g, 
        params.h,
        candidateNames  // Adicionar array de candidatos
    );
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log(`\nContrato deployado em: ${contractAddress}`);
    
    // Configurar relayer (segunda conta)
    const signers = await hre.ethers.getSigners();
    if (signers.length > 1) {
        const relayer = signers[1];
        console.log(`\nConfigurando relayer: ${relayer.address}`);
        await contract.authorizeRelayer(relayer.address);
        console.log("✓ Relayer autorizado!");
    }
    
    // Salvar endereço e informações do contrato
    const data = {
        contract: contractAddress,
        candidateNames: candidateNames,
        relayer: signers.length > 1 ? signers[1].address : null,
        paramsFile: 'elgamal-params.json',
        deployed: new Date().toISOString()
    };
    
    fs.writeFileSync('elgamal-contract.json', JSON.stringify(data, null, 2));
    console.log("\nInformações salvas:");
    console.log("  - Endereço do contrato em elgamal-contract.json");
    console.log("  - Parâmetros ElGamal em elgamal-params.json");
    console.log("  - Candidatos: " + candidateNames.join(", "));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });