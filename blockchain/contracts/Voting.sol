// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Ballot {
    struct Voter {
        bool isVoted;         
        bool hasRightToVote;  
        uint8 vote;           
        address ID;          
    }

    struct Proposal {
        string name;          
        uint voteCount;       
    }

    address public chairPerson;
    
    bool public votingPaused;

    mapping(address => Voter) public voters;

    Proposal[] public proposals;

    event VoteCast(uint indexed blockNumber, string candidateName);
    event VotingPaused();
    event VotingResumed();

    modifier onlyChairPerson() {
        require(msg.sender == chairPerson, "Apenas o administrador pode executar esta funcao");
        _;
    }
    
    modifier whenNotPaused() {
        require(!votingPaused, "A votacao esta pausada");
        _;
    }
    
    constructor(string[] memory candidateNames) {
        chairPerson = msg.sender;
        votingPaused = false; // Votação inicia ativa
        
        for (uint i = 0; i < candidateNames.length; i++) {
            proposals.push(Proposal({
                name: candidateNames[i],
                voteCount: 0
            }));
        }
        
        voters[chairPerson].hasRightToVote = true;
    }

    function giveRightToVote(address toVoter) public onlyChairPerson {
        require(!voters[toVoter].isVoted, "Eleitor ja votou");
        
        voters[toVoter].hasRightToVote = true;
        
        voters[toVoter].ID = toVoter;
    }

    function vote(uint8 toProposal) public whenNotPaused {
        Voter storage sender = voters[msg.sender];
        
        require(!sender.isVoted, "Voce ja votou");
        require(toProposal < proposals.length, "Proposta invalida");
        require(sender.hasRightToVote, "Voce nao tem direito a voto");
        
        sender.isVoted = true;
        sender.vote = toProposal;
        
        proposals[toProposal].voteCount += 1;

        emit VoteCast(
            block.number,                 
            proposals[toProposal].name   
        );
    }

    function winningProposal() public view returns (uint256 _winningProposal) {
        uint256 winningVoteCount = 0;
        _winningProposal = 0;
        
        for (uint8 prop = 0; prop < proposals.length; prop++) {
            if (proposals[prop].voteCount > winningVoteCount) {
                winningVoteCount = proposals[prop].voteCount;
                _winningProposal = prop;
            }
        }
    }

    function winnerName() public view returns (string memory) {
        return proposals[winningProposal()].name;
    }
    
    function getProposalCount() public view returns (uint) {
        return proposals.length;
    }

    function hasRightToVote(address voter) public view returns (bool) {
        return voters[voter].hasRightToVote;
    }

    function getCandidate(uint index) public view returns (string memory name, uint voteCount) {
        require(index < proposals.length, "Candidato nao existe");
        Proposal storage proposal = proposals[index];
        return (proposal.name, proposal.voteCount);
    }

    function pauseVoting() public onlyChairPerson {
        require(!votingPaused, "A votacao ja esta pausada");
        votingPaused = true;
        emit VotingPaused();
    }

    function resumeVoting() public onlyChairPerson {
        require(votingPaused, "A votacao nao esta pausada");
        votingPaused = false;
        emit VotingResumed();
    }

    function isVotingPaused() public view returns (bool) {
        return votingPaused;
    }
}