const hre = require("hardhat");
const fs = require('fs');

async function deployContract(candidateNames) {
  const accounts = await hre.ethers.getSigners();
  const deployer = accounts[0];
  
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
  console.log(`Candidates: ${candidateNames.join(", ")}`);
  
  const Ballot = await hre.ethers.getContractFactory("Ballot");
  const ballot = await Ballot.deploy(candidateNames);
  await ballot.waitForDeployment();
  
  const address = await ballot.getAddress();
  console.log(`Contract deployed at: ${address}`);
  
  // Save contract address
  fs.writeFileSync('contract-address.txt', `${address}`);
  
  return ballot;
}

async function main() {
  try {
    const candidateNames = ["Paulo", "Maria", "João"];
    const ballot = await deployContract(candidateNames);
    
    // Display initial info
    const numProposals = await ballot.getProposalCount();
    const chairPerson = await ballot.chairPerson();
    
    console.log(`\nContract Info:`);
    console.log(`ChairPerson: ${chairPerson}`);
    console.log(`Candidates: ${numProposals}`);
    
    for (let i = 0; i < numProposals; i++) {
      const candidate = await ballot.getCandidate(i);
      console.log(`  [${i}] ${candidate[0]} (${candidate[1]} votes)`);
    }
    
    console.log(`\nDeployment successful!`);
  } catch (error) {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  }
}

module.exports = { deployContract };

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}