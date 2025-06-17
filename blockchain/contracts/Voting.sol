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

    // Endereço do administrador da votação
    address public chairPerson;
    
    // Estado da votação (pausado/ativo)
    bool public votingPaused;

    // Mapeamento de endereços para eleitores
    mapping(address => Voter) public voters;

    // Array de propostas/candidatos
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
        
        // Inicializa o array de propostas com os nomes dos candidatos
        for (uint i = 0; i < candidateNames.length; i++) {
            proposals.push(Proposal({
                name: candidateNames[i],
                voteCount: 0
            }));
        }
        
        voters[chairPerson].hasRightToVote = true;
    }

    // Função para dar direito de voto a um endereço
    function giveRightToVote(address toVoter) public onlyChairPerson {
        require(!voters[toVoter].isVoted, "Eleitor ja votou");
        
        voters[toVoter].hasRightToVote = true;
        
        voters[toVoter].ID = toVoter;
    }

    // Função para votar em uma proposta
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

    // Função para determinar a proposta vencedora
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
    
    // Função para obter o nome do candidato vencedor
    function winnerName() public view returns (string memory) {
        return proposals[winningProposal()].name;
    }
    
    // Função para obter o número total de propostas
    function getProposalCount() public view returns (uint) {
        return proposals.length;
    }
    
    // Função para verificar se alguém tem direito a voto
    function hasRightToVote(address voter) public view returns (bool) {
        return voters[voter].hasRightToVote;
    }
    
    // Função para obter informações sobre um candidato
    function getCandidate(uint index) public view returns (string memory name, uint voteCount) {
        require(index < proposals.length, "Candidato nao existe");
        Proposal storage proposal = proposals[index];
        return (proposal.name, proposal.voteCount);
    }
    
    // Função para pausar a votação
    function pauseVoting() public onlyChairPerson {
        require(!votingPaused, "A votacao ja esta pausada");
        votingPaused = true;
        emit VotingPaused();
    }
    
    // Função para retomar a votação
    function resumeVoting() public onlyChairPerson {
        require(votingPaused, "A votacao nao esta pausada");
        votingPaused = false;
        emit VotingResumed();
    }
    
    // Função para verificar se a votação está pausada
    function isVotingPaused() public view returns (bool) {
        return votingPaused;
    }
}