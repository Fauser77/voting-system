// deploy-elgamal.js
// Script simplificado para apenas fazer o deploy do contrato ElGamal
// Execução: npx hardhat run scripts/deploy-elgamal.js --network poa

const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== Deploy do Contrato ElGamalVoting ===\n");
    
    // Parâmetros ElGamal (pequenos para teste)
    const p = 2147483647n;  // Primo de Mersenne (2^31 - 1)
    const g = 3n;           // Gerador primitivo para este primo
    const x = 1234567890n;  // Chave privada maior (SECRETA!)
    const h = 1521993626n; // g^x mod p = 3^1234567890 mod 2147483647
    
    console.log("Parâmetros ElGamal:");
    console.log(`  P (primo): ${p}`);
    console.log(`  G (gerador): ${g}`);
    console.log(`  H (chave pública): ${h}`);
    console.log(`  X (chave privada - SECRETA): ${x}\n`);
    
    // Deploy
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying com a conta: ${deployer.address}`);
    
    const ElGamalVoting = await hre.ethers.getContractFactory("ElGamalVoting");
    const contract = await ElGamalVoting.deploy(p, g, h);
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log(`\nContrato deployado em: ${contractAddress}`);
    
    // Salvar endereço e parâmetros
    const data = {
        contract: contractAddress,
        p: p.toString(),
        g: g.toString(),
        h: h.toString(),
        x: x.toString(),
        deployed: new Date().toISOString()
    };
    
    fs.writeFileSync('elgamal-contract.json', JSON.stringify(data, null, 2));
    console.log("\nEndereço e parâmetros salvos em elgamal-contract.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });