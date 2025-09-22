// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Ballot {

// ======================== ESTRUTURAS ========================
    struct EncryptedVote {
        uint256[] c1_values; 
        uint256[] c2_values;  
        uint256 timestamp;
        address relayer;
    }

    struct Voter {
        bool hasRightToVote;
        bool hasVoted;
    }

// ======================== VARIÁVEIS DE ESTADO ========================
    address public immutable admin;
    bool public votingEnded;

    uint256 public immutable p; 
    uint256 public immutable g; 
    uint256 public immutable h;

    uint256 public immutable numCandidates;
    string[] public candidateNames;

    EncryptedVote[] public encryptedVotes;
    
    // Mapeamentos, é um estado interno do contrato!
    mapping(address => Voter) public voters;
    mapping(address => bool) public authorizedRelayers;

    // Para estatísticas futuras, sobretudo de participação
    uint256 public immutable totalAuthorizedVoters;

    // Resultado final (preenchido após decifração off-chain)
    uint256 public winningProposalIndex;
    bool public resultsPublished;
    uint256[] public finalVoteCounts;

// ======================== EVENTOS ========================
    event VoteSubmitted(
        uint256[] c1_values,
        uint256[] c2_values,
        uint256 timestamp,
        address indexed relayer
    );
    
    event ElGamalParametersSet(uint256 p, uint256 g, uint256 h);
    event VoterAuthorized(address indexed voter);
    event RelayerAuthorized(address indexed relayer);
    event VotingEnded(uint256 timestamp);
    event ResultsPublished(uint256[] voteCounts, uint256 winnerIndex);

// ======================== MODIFICADORES ========================
    modifier onlyAdmin() {
        require(msg.sender == admin, "Apenas administrador");
        _;
    }
    
    modifier votingActive() {
        require(!votingEnded, "Votacao encerrada");
        _;
    }
    
    modifier votingFinished() {
        require(votingEnded, "Votacao ainda ativa");
        _;
    }

// ======================== CONSTRUTOR ========================
    constructor(
        uint256 _p,
        uint256 _g,
        uint256 _h,
        string[] memory _candidateNames,
        address[] memory _authorizedVoters,
        address[] memory _authorizedRelayers
    ) {
        require(_candidateNames.length > 0, "Minimo 1 candidato");
        require(_authorizedVoters.length > 0, "Minimo 1 eleitor");
        require(_authorizedRelayers.length > 0, "Minimo 1 relayer");
        require(_p > 1000000, "P deve ser maior que 1 milhao para seguranca");
        require(_h < _p, "H deve ser menor que P");
        require(_g > 1 && _g < _p, "G deve estar entre 1 e P");
        
        admin = msg.sender;
        p = _p;
        g = _g;
        h = _h;
        numCandidates = _candidateNames.length;
        candidateNames = _candidateNames;
        totalAuthorizedVoters = _authorizedVoters.length;
        votingEnded = false;
        resultsPublished = false;
        
        for (uint i = 0; i < _authorizedVoters.length; i++) {
            voters[_authorizedVoters[i]].hasRightToVote = true;
            emit VoterAuthorized(_authorizedVoters[i]);
        }
        
        for (uint i = 0; i < _authorizedRelayers.length; i++) {
            authorizedRelayers[_authorizedRelayers[i]] = true;
            emit RelayerAuthorized(_authorizedRelayers[i]);
        }
        
        emit ElGamalParametersSet(_p, _g, _h);
    }

// ======================== FUNÇÕES DE VOTAÇÃO ========================
    // event ElGamalParametersSet(uint256 p, uint256 g, uint256 h);
    function submitEncryptedVote(
        uint256[] memory _c1_values,
        uint256[] memory _c2_values,
        address _voter
    ) public votingActive {
        require(authorizedRelayers[msg.sender], "Relayer nao autorizado");
        require(voters[_voter].hasRightToVote, "Eleitor nao autorizado");
        require(!voters[_voter].hasVoted, "Eleitor ja votou");
        require(_c1_values.length == numCandidates, "Numero incorreto de C1");
        require(_c2_values.length == numCandidates, "Numero incorreto de C2");
        
        for(uint i = 0; i < numCandidates; i++) {
            require(_c1_values[i] > 0 && _c1_values[i] < p, "C1 invalido");
            require(_c2_values[i] > 0 && _c2_values[i] < p, "C2 invalido");
        }
        
        EncryptedVote memory newVote = EncryptedVote({
            c1_values: _c1_values,
            c2_values: _c2_values,
            timestamp: block.timestamp,
            relayer: msg.sender
        });
        
        encryptedVotes.push(newVote);
        voters[_voter].hasVoted = true; 
        
        emit VoteSubmitted(
            _c1_values,
            _c2_values,
            block.timestamp,
            msg.sender
        );
    }

// ======================== FUNÇÕES DE ENCERRAMENTO ========================
    function endVoting() public onlyAdmin votingActive {
        votingEnded = true;
        emit VotingEnded(block.timestamp);
    }
    
    function publishResults(
        uint256[] memory _voteCounts,
        uint256 _winnerIndex
    ) public onlyAdmin votingFinished {
        require(!resultsPublished, "Resultados ja publicados");
        require(_voteCounts.length == numCandidates, "Numero incorreto de resultados");
        require(_winnerIndex < numCandidates, "Indice do vencedor invalido");
        
        finalVoteCounts = _voteCounts;
        winningProposalIndex = _winnerIndex;
        resultsPublished = true;
        
        emit ResultsPublished(_voteCounts, _winnerIndex);
    }
    
// ======================== FUNÇÕES DE CONSULTA ========================   
    function getTotalVotes() public view returns (uint256) {
        return encryptedVotes.length;
    }

    function getAllEncryptedVotes() public view returns (EncryptedVote[] memory) {
        return encryptedVotes;
    }
    
    function getVote(uint256 _index) public view returns (
        uint256[] memory c1_values,
        uint256[] memory c2_values,
        uint256 timestamp,
        address relayer
    ) {
        require(_index < encryptedVotes.length, "Indice invalido");
        EncryptedVote memory vote = encryptedVotes[_index];
        return (
            vote.c1_values,
            vote.c2_values,
            vote.timestamp,
            vote.relayer
        );
    }
    
    // Será útil no front
    function hasRightToVote(address _voter) public view returns (bool) {
        return voters[_voter].hasRightToVote;
    }
    
    // Será útil no front
    function hasVoted(address _voter) public view returns (bool) {
        return voters[_voter].hasVoted;
    }
    
    function getCandidate(uint256 _index) public view returns (
        string memory name,
        uint256 voteCount
    ) {
        require(_index < candidateNames.length, "Candidato nao existe");
        
        if (resultsPublished) {
            return (candidateNames[_index], finalVoteCounts[_index]);
        } else {
            return (candidateNames[_index], 0);
        }
    }
    
    function getWinnerName() public view returns (string memory) {
        require(resultsPublished, "Resultados nao publicados");
        return candidateNames[winningProposalIndex];
    }
    
    function getProposalCount() public view returns (uint256) {
        return candidateNames.length;
    }
    
    function getElGamalParameters() public view returns (
        uint256 prime,
        uint256 generator,
        uint256 publicKey
    ) {
        return (p, g, h);
    }
    
    function getVotingStatus() public view returns (
        bool isEnded,
        bool hasResults,
        uint256 totalVotes,
        uint256 totalCandidates
    ) {
        return (
            votingEnded,
            resultsPublished,
            encryptedVotes.length,
            numCandidates
        );
    }
    
    function getVoterStats() public view returns (
        uint256 totalAuthorized,
        uint256 totalVoted,
        uint256 participationPercentage
    ) {
        uint256 voted = encryptedVotes.length;
        uint256 percentage = 0;
        
        if (totalAuthorizedVoters > 0) {
            percentage = (voted * 100) / totalAuthorizedVoters;
        }
        
        return (
            totalAuthorizedVoters,
            voted,
            percentage
        );
    }
    
}