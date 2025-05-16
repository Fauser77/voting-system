// verify-accounts.js
// Script para verificar e financiar as contas dos eleitores, caso necessário

const { ethers } = require("hardhat");

async function main() {
  console.log("=== Verificação das contas de eleitores ===");
  
  // Obter as contas
  const accounts = await ethers.getSigners();
  const chairperson = accounts[0];
  
  console.log(`Chairperson: ${chairperson.address}`);
  const chairpersonBalance = await ethers.provider.getBalance(chairperson.address);
  console.log(`Saldo: ${ethers.formatEther(chairpersonBalance)} ETH`);
  
  // Verificar outras contas de eleitores
  console.log("\n=== Contas de eleitores ===");
  for (let i = 1; i < Math.min(accounts.length, 5); i++) {
    const voterAddress = accounts[i].address;
    const balance = await ethers.provider.getBalance(voterAddress);
    
    console.log(`Eleitor ${i}: ${voterAddress}`);
    console.log(`Saldo: ${ethers.formatEther(balance)} ETH`);
    
    console.log("-".repeat(50));
  }
  
  console.log("Verificação e financiamento de contas concluído!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro durante a verificação das contas:");
    console.error(error);
    process.exit(1);
  });