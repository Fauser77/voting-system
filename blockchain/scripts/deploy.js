const hre = require("hardhat");

async function main() {
  const Voting = await hre.ethers.getContractFactory("Voting");
  
  console.log("Iniciando deploy do contrato Voting...");
  const voting = await Voting.deploy();
  
  await voting.waitForDeployment();
  
  const votingAddress = await voting.getAddress();
  
  console.log("Contrato Voting implantado no endereço:", votingAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });