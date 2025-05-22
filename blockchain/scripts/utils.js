const fs = require('fs');
const { ethers } = require('hardhat');

function getContractAddress() {
  try {
    return fs.readFileSync('contract-address.txt', 'utf8').trim();
  } catch (error) {
    throw new Error("Contract address not found. Run deploy script first.");
  }
}

async function connectToBallot(address = null) {
  const contractAddress = address || getContractAddress();
  const Ballot = await ethers.getContractFactory("Ballot");
  return await Ballot.attach(contractAddress);
}

async function displayBallotInfo(ballot, accounts = null) {
  console.log("=== Contract Info ===");
  
  const chairPerson = await ballot.chairPerson();
  const numProposals = await ballot.getProposalCount();
  
  console.log(`ChairPerson: ${chairPerson}`);
  console.log(`Candidates: ${numProposals}`);
  
  console.log("\nCandidates:");
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    console.log(`  [${i}] ${candidate[0]} (${candidate[1]} votes)`);
  }
  
  if (accounts) {
    console.log("\nAccounts status:");
    for (let i = 0; i < Math.min(accounts.length, 5); i++) {
      const addr = accounts[i].address;
      const hasRight = await ballot.hasRightToVote(addr);
      const voter = await ballot.voters(addr);
      
      console.log(`  [${i}] ${addr}`);
      console.log(`      Rights: ${hasRight ? '✓' : '✗'} | Voted: ${voter.isVoted ? '✓' : '✗'}`);
    }
  }
}

async function displayResults(ballot) {
  console.log("=== Election Results ===");
  
  const numProposals = await ballot.getProposalCount();
  let totalVotes = 0;
  
  // Calculate total votes
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    totalVotes += Number(candidate[1]);
  }
  
  // Display results
  console.log("Vote count:");
  for (let i = 0; i < numProposals; i++) {
    const candidate = await ballot.getCandidate(i);
    const voteCount = Number(candidate[1]);
    const percentage = totalVotes > 0 ? ((voteCount * 100) / totalVotes).toFixed(1) : "0.0";
    
    console.log(`  [${i}] ${candidate[0]}: ${voteCount} votes (${percentage}%)`);
  }
  
  // Winner
  const winnerIndex = await ballot.winningProposal();
  const winnerName = await ballot.winnerName();
  
  console.log(`\nWinner: ${winnerName} (index ${winnerIndex})`);
  console.log(`Total votes: ${totalVotes}`);
}

function setupVoteMonitoring(ballot) {
  console.log("Starting vote monitoring...");
  
  const filter = ballot.filters.VoteCast();
  
  const handleEvent = async (blockNumber, candidateName) => {
    console.log(`[${new Date().toLocaleTimeString()}] New vote:`);
    console.log(`  Block: ${blockNumber}`);
    console.log(`  Candidate: ${candidateName}`);
  };
  
  ballot.on(filter, handleEvent);
  
  return () => {
    console.log("Stopping monitoring...");
    ballot.off(filter, handleEvent);
  };
}

module.exports = {
  getContractAddress,
  connectToBallot,
  displayBallotInfo,
  displayResults,
  setupVoteMonitoring
};