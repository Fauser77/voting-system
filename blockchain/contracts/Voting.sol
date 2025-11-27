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

    // CPF Management
    mapping(bytes32 => bool) public cpfUsed; // Track if CPF hash was already used
    mapping(address => bytes32) public voterToCPF; // Link voter address to CPF hash

    // Para estatísticas futuras, sobretudo de participação
    uint256 public totalAuthorizedVoters;

    // Resultado final (preenchido após decifração off-chain)
    uint256 public winningProposalIndex;
    bool public resultsPublished;
    uint256[] public finalVoteCounts;

    enum ElectionPhase { Registration, Voting, Ended }
    ElectionPhase public phase;

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

    // Event for voter registration
    event VoterRegistered(address indexed voter, bytes32 indexed cpfHash);

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
        address[] memory _authorizedRelayers
    ) {
        require(_candidateNames.length > 0, "Minimo 1 candidato");
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
        totalAuthorizedVoters = 0;
        votingEnded = false;
        resultsPublished = false;
        phase = ElectionPhase.Registration;

        for (uint i = 0; i < _authorizedRelayers.length; i++) {
            authorizedRelayers[_authorizedRelayers[i]] = true;
            emit RelayerAuthorized(_authorizedRelayers[i]);
        }
        
        emit ElGamalParametersSet(_p, _g, _h);
    }

    function setPhase(ElectionPhase _phase) external onlyAdmin() {
    //require(uint8(_phase) >= uint8(phase), "Nao e possivel voltar fases");
    phase = _phase;
    }

// ======================== FUNÇÕES DE AUTORIZAÇÃO ========================

// Check if a CPF hash has been used
function checkCPFStatus(bytes32 cpfHash) public view returns (bool isUsed) {
    return cpfUsed[cpfHash];
}

// Register a new voter with their CPF hash
function registerVoterWithCPF(address voterAddress, bytes32 cpfHash) public onlyAdmin {
    require(phase == ElectionPhase.Registration, "Cadastro encerrado");
    require(voterAddress != address(0), "Invalid voter address");
    require(cpfHash != bytes32(0), "Invalid CPF hash");
    require(!cpfUsed[cpfHash], "CPF already used");

    // Mark CPF as used
    cpfUsed[cpfHash] = true;
    
    // Link voter to CPF
    voterToCPF[voterAddress] = cpfHash;
    
    voters[voterAddress].hasRightToVote = true;

    totalAuthorizedVoters++; 

    // Emit event
    emit VoterRegistered(voterAddress, cpfHash);
    emit VoterAuthorized(voterAddress);
}

// Optional: Get CPF hash for a voter
function getVoterCPFHash(address voter) public view returns (bytes32) {
    return voterToCPF[voter];
}

// // Optional: Batch register multiple voters (useful for initial setup)
// function batchRegisterVoters(address[] memory voters, bytes32[] memory cpfHashes) public onlyAdmin {
//     require(voters.length == cpfHashes.length, "Arrays must have same length");
    
//     for (uint i = 0; i < voters.length; i++) {
//         registerVoterWithCPF(voters[i], cpfHashes[i]);
//     }
// }

// ======================== FUNÇÕES DE VOTAÇÃO ========================
    function submitEncryptedVote(
        uint256[] memory _c1_values,
        uint256[] memory _c2_values,
        bytes memory _signature,
        address _voter
    ) public votingActive {

        require(phase == ElectionPhase.Voting, "Votacao nao iniciada ou encerrada");
        require(authorizedRelayers[msg.sender], "Relayer nao autorizado");

        // Reconstrói o hash dos dados do voto
        bytes32 messageHash = keccak256(abi.encode(
            _c1_values,
            _c2_values
        ));

        // Adiciona prefixo Ethereum para segurança
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            messageHash
        ));

        // Recupera o endereço do assinante
        address signer = recoverSigner(ethSignedMessageHash, _signature);

        // Verifica se a assinatura corresponde ao eleitor informado
        require(signer == _voter, "Assinatura invalida para este eleitor");
 
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

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature) 
        internal 
        pure 
        returns (address) 
    {
        require(_signature.length == 65, "Assinatura invalida");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
        
        return ecrecover(_ethSignedMessageHash, v, r, s);
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
        require(phase == ElectionPhase.Ended, "Resultado disponivel apenas ao final");
        return encryptedVotes.length;
    }

    function getAllEncryptedVotes() public view returns (EncryptedVote[] memory) {
        require(phase == ElectionPhase.Ended, "Resultado disponivel apenas ao final");
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
        require(phase == ElectionPhase.Ended, "Resultado disponivel apenas ao final");
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