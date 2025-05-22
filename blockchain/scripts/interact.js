const hre = require("hardhat");
const readline = require('readline');
const { connectToBallot, displayBallotInfo, displayResults } = require('./utils');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function giveRightToVote(ballot, chairperson, voterAddress) {
  const hasRight = await ballot.hasRightToVote(voterAddress);
  if (hasRight) {
    console.log(`Address ${voterAddress} already has voting rights`);
    return true;
  }
  
  try {
    const tx = await ballot.connect(chairperson).giveRightToVote(voterAddress);
    await tx.wait();
    console.log(`Voting rights granted to ${voterAddress}`);
    return true;
  } catch (error) {
    console.error(`Error granting rights: ${error.message}`);
    return false;
  }
}

async function vote(ballot, voter, candidateIndex) {
  try {
    const candidate = await ballot.getCandidate(candidateIndex);
    console.log(`Voting for: ${candidate[0]}`);
    
    const tx = await ballot.connect(voter).vote(candidateIndex);
    await tx.wait();
    
    console.log(`Vote registered successfully`);
    return true;
  } catch (error) {
    console.error(`Error voting: ${error.message}`);
    return false;
  }
}

async function showMenu() {
  console.clear();
  console.log("=== Voting System ===");
  console.log("1. Contract Info");
  console.log("2. Grant Voting Rights");
  console.log("3. Vote");
  console.log("4. View Results");
  console.log("0. Exit");
  console.log("-".repeat(25));
  
  return await prompt("Choose option: ");
}

async function grantRightsMenu(ballot, accounts) {
  console.clear();
  console.log("=== Grant Voting Rights ===");
  
  const chairperson = accounts[0];
  console.log(`ChairPerson: ${chairperson.address}`);
  
  console.log("\nAvailable accounts:");
  for (let i = 1; i < Math.min(accounts.length, 6); i++) {
    const addr = accounts[i].address;
    const hasRight = await ballot.hasRightToVote(addr);
    console.log(`[${i}] ${addr} ${hasRight ? '✓' : '✗'}`);
  }
  
  const choice = await prompt("\nAccount number (0 to go back): ");
  if (choice === '0') return;
  
  const index = parseInt(choice);
  if (index > 0 && index < accounts.length) {
    await giveRightToVote(ballot, chairperson, accounts[index].address);
  } else {
    console.log("Invalid account number");
  }
  
  await prompt("Press Enter to continue...");
}

async function voteMenu(ballot, accounts) {
  console.clear();
  console.log("=== Vote ===");
  
  console.log("Select account to vote:");
  for (let i = 0; i < Math.min(accounts.length, 6); i++) {
    const addr = accounts[i].address;
    const hasRight = await ballot.hasRightToVote(addr);
    const voter = await ballot.voters(addr);
    
    console.log(`[${i}] ${addr}`);
    console.log(`    Rights: ${hasRight ? '✓' : '✗'} | Voted: ${voter.isVoted ? '✓' : '✗'}`);
  }
  
  const accountChoice = await prompt("\nAccount number (9 to go back): ");
  if (accountChoice === '9') return;
  
  const accountIndex = parseInt(accountChoice);
  if (accountIndex < 0 || accountIndex >= accounts.length) {
    console.log("Invalid account");
    await prompt("Press Enter to continue...");
    return;
  }
  
  const voter = accounts[accountIndex];
  const hasRight = await ballot.hasRightToVote(voter.address);
  const voterInfo = await ballot.voters(voter.address);
  
  if (!hasRight) {
    console.log("Account has no voting rights");
    await prompt("Press Enter to continue...");
    return;
  }
  
  if (voterInfo.isVoted) {
    console.log("Account already voted");
    await prompt("Press Enter to continue...");
    return;
  }
  
  console.log("\nCandidates:");
  const numProposals = await ballot.getProposalCount();
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`[${i}] ${candidate[0]} (${candidate[1]} votes)`);
  }
  
  const candidateChoice = await prompt("\nCandidate number: ");
  const candidateIndex = parseInt(candidateChoice);
  
  if (candidateIndex >= 0 && candidateIndex < numProposals) {
    await vote(ballot, voter, candidateIndex);
  } else {
    console.log("Invalid candidate");
  }
  
  await prompt("Press Enter to continue...");
}

async function main() {
  try {
    const ballot = await connectToBallot();
    const accounts = await hre.ethers.getSigners();
    
    let running = true;
    
    while (running) {
      const choice = await showMenu();
      
      switch (choice) {
        case '1':
          console.clear();
          await displayBallotInfo(ballot, accounts);
          await prompt("\nPress Enter to continue...");
          break;
          
        case '2':
          await grantRightsMenu(ballot, accounts);
          break;
          
        case '3':
          await voteMenu(ballot, accounts);
          break;
          
        case '4':
          console.clear();
          await displayResults(ballot);
          await prompt("\nPress Enter to continue...");
          break;
          
        case '0':
          running = false;
          break;
          
        default:
          console.log("Invalid option");
          await prompt("Press Enter to continue...");
      }
    }
    
    console.log("Exiting...");
    rl.close();
  } catch (error) {
    console.error("Error:", error.message);
    rl.close();
    process.exit(1);
  }
}

module.exports = { giveRightToVote, vote };

if (require.main === module) {
  main();
}