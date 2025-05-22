const hre = require("hardhat");
const fs = require('fs');
const { connectToBallot } = require('./utils');

async function findVotingBlocks(contractAddress) {
  console.log("=== Voting Blocks Analysis ===");
  console.log(`Contract: ${contractAddress}\n`);
  
  const provider = hre.ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  const startBlock = Math.max(1, currentBlock - 1000);
  
  console.log(`Current block: ${currentBlock}`);
  console.log(`Searching from block ${startBlock} to ${currentBlock}`);
  
  const votingBlocks = [];
  
  console.log("\nSearching for vote events...");
  
  // Method 1: Search for VoteCast events (more efficient)
  try {
    const Ballot = await hre.ethers.getContractFactory("Ballot");
    const ballot = await Ballot.attach(contractAddress);
    const filter = ballot.filters.VoteCast();
    const voteEvents = await ballot.queryFilter(filter, startBlock, currentBlock);
    
    if (voteEvents.length > 0) {
      console.log(`Found ${voteEvents.length} vote events!`);
      
      for (const event of voteEvents) {
        const tx = await provider.getTransaction(event.transactionHash);
        const block = await provider.getBlock(event.blockNumber);
        
        const existingBlock = votingBlocks.find(b => b.blockNumber === event.blockNumber);
        
        if (existingBlock) {
          const txExists = existingBlock.transactions.some(t => t.hash === event.transactionHash);
          if (!txExists) {
            existingBlock.transactions.push({
              hash: event.transactionHash,
              from: tx ? tx.from : "unknown",
              type: "vote",
              candidateName: event.args ? event.args.candidateName : "unknown"
            });
          }
        } else {
          votingBlocks.push({
            blockNumber: event.blockNumber,
            timestamp: block.timestamp,
            transactions: [{
              hash: event.transactionHash,
              from: tx ? tx.from : "unknown",
              type: "vote",
              candidateName: event.args ? event.args.candidateName : "unknown"
            }]
          });
        }
      }
    } else {
      console.log("No vote events found. Trying transaction search...");
    }
  } catch (error) {
    console.error(`Error searching events: ${error.message}`);
    console.log("Continuing with transaction search...");
  }
  
  // Method 2: Search by transactions (fallback)
  if (votingBlocks.length === 0) {
    console.log("\nSearching contract transactions...");
    
    for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber++) {
      if (blockNumber % 20 === 0) {
        process.stdout.write(`\rChecking blocks... ${Math.floor(((blockNumber - startBlock) / (currentBlock - startBlock)) * 100)}% complete (${blockNumber}/${currentBlock})`);
      }
      
      try {
        const block = await provider.getBlock(blockNumber, true);
        
        if (block && block.transactions && block.transactions.length > 0) {
          let contractRelatedTxs = [];
          
          for (const tx of block.transactions) {
            // Check transactions TO the contract
            if (tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
              const receipt = await provider.getTransactionReceipt(tx.hash);
              const isVoteTransaction = receipt && receipt.logs && receipt.logs.length > 0;
              
              if (isVoteTransaction) {
                contractRelatedTxs.push({
                  hash: tx.hash,
                  from: tx.from,
                  type: "vote",
                  gasUsed: receipt.gasUsed.toString()
                });
                
                console.log(`\n✅ Found VOTE transaction!`);
                console.log(`   Block: ${blockNumber}`);
                console.log(`   Hash: ${tx.hash}`);
                console.log(`   From: ${tx.from}`);
              } else {
                contractRelatedTxs.push({
                  hash: tx.hash,
                  from: tx.from,
                  type: "interaction",
                  gasUsed: receipt ? receipt.gasUsed.toString() : "unknown"
                });
              }
            } 
            // Check contract DEPLOY transactions
            else if (!tx.to) {
              try {
                const receipt = await provider.getTransactionReceipt(tx.hash);
                
                if (receipt && receipt.contractAddress && 
                    receipt.contractAddress.toLowerCase() === contractAddress.toLowerCase()) {
                  contractRelatedTxs.push({
                    hash: tx.hash,
                    from: tx.from,
                    type: "deploy",
                    gasUsed: receipt.gasUsed.toString()
                  });
                  console.log(`\n✅ Found CONTRACT DEPLOY!`);
                  console.log(`   Block: ${blockNumber}`);
                  console.log(`   Hash: ${tx.hash}`);
                  console.log(`   From: ${tx.from}`);
                }
              } catch (error) {
                // Ignore receipt errors
              }
            }
          }
          
          if (contractRelatedTxs.length > 0) {
            votingBlocks.push({
              blockNumber: blockNumber,
              timestamp: block.timestamp,
              transactions: contractRelatedTxs
            });
          }
        }
      } catch (error) {
        // Ignore block errors
      }
    }
    
    process.stdout.write(`\rChecking blocks... 100% complete (${currentBlock}/${currentBlock})\n\n`);
  }
  
  return votingBlocks;
}

function displayBlockResults(votingBlocks, contractAddress) {
  console.log(`\nTotal blocks found: ${votingBlocks.length}`);
  
  if (votingBlocks.length > 0) {
    votingBlocks.sort((a, b) => b.blockNumber - a.blockNumber);
    
    console.log("\n=== Block Details ===");
    
    for (const block of votingBlocks) {
      const date = new Date(block.timestamp * 1000);
      
      console.log(`\nBlock #${block.blockNumber}`);
      console.log(`Timestamp: ${block.timestamp} (${date.toLocaleString()})`);
      console.log(`Transactions: ${block.transactions.length}`);
      
      for (let i = 0; i < block.transactions.length; i++) {
        const tx = block.transactions[i];
        console.log(`  Transaction ${i+1}:`);
        console.log(`    Hash: ${tx.hash}`);
        console.log(`    From: ${tx.from || "Not identified"}`);
        console.log(`    Type: ${tx.type}`);
        
        if (tx.candidateName) {
          console.log(`    Candidate: ${tx.candidateName}`);
        }
        
        if (tx.gasUsed) {
          console.log(`    Gas used: ${tx.gasUsed}`);
        }
        
        if (tx.type === "deploy") {
          console.log(`    Description: Contract creation`);
        } else if (tx.type === "vote") {
          console.log(`    Description: Vote registration`);
        }
      }
    }
    
    // Save results
    const outputData = {
      contractAddress: contractAddress,
      totalBlocks: votingBlocks.length,
      blocks: votingBlocks
    };
    
    fs.writeFileSync('voting-blocks.json', JSON.stringify(outputData, null, 2));
    console.log(`\nResults saved to 'voting-blocks.json'`);
  } else {
    console.log("No blocks found with contract transactions.");
    console.log("\nTroubleshooting recommendations:");
    console.log("1. Verify contract address is correct");
    console.log("2. Confirm votes were actually registered on blockchain");
    console.log("3. Check you're connected to correct network");
    console.log("4. Try increasing block search range");
  }
}

async function main() {
  try {
    console.log("=== Blockchain Voting Monitor ===");
    
    const ballot = await connectToBallot();
    const contractAddress = await ballot.getAddress();
    
    console.log(`Monitoring contract: ${contractAddress}`);
    
    const votingBlocks = await findVotingBlocks(contractAddress);
    displayBlockResults(votingBlocks, contractAddress);
    
  } catch (error) {
    console.error("Monitor error:", error.message);
    process.exit(1);
  }
}

module.exports = { findVotingBlocks, displayBlockResults };

if (require.main === module) {
  main();
}