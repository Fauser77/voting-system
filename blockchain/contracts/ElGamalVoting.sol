// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ElGamalVoting {
    struct EncryptedVote {
        uint256[] c1_values;  // Um C1 para cada candidato
        uint256[] c2_values;  // Um C2 para cada candidato
        uint256 timestamp;
        address relayer;      // Endereço do relayer que enviou
        address voter;        // Endereço real do eleitor (criptografado off-chain)
    }
    
    // Array para armazenar todos os votos cifrados
    EncryptedVote[] public encryptedVotes;
    
    // Mapeamento para rastrear quem já votou
    mapping(address => bool) public hasVoted;
    
    // Parâmetros públicos do ElGamal (serão definidos no deploy)
    uint256 public p; // Primo grande
    uint256 public g; // Gerador
    uint256 public h; // Chave pública (g^x mod p)

    uint256 public numCandidates;
    string[] public candidateNames;
    mapping(address => bool) public authorizedRelayers;
    address public admin;
    
    // Eventos para auditoria
    event VoteSubmitted(
    bytes32 indexed txHash,
    uint256[] c1_values,
    uint256[] c2_values,
    uint256 timestamp,
    address relayer
    );
    
    event ElGamalParametersSet(uint256 p, uint256 g, uint256 h);
    
    constructor(uint256 _p, uint256 _g, uint256 _h, string[] memory _candidateNames) {
    require(_candidateNames.length >= 2, "Minimo 2 candidatos");
    p = _p;
    g = _g;
    h = _h;
    numCandidates = _candidateNames.length;
    candidateNames = _candidateNames;
    admin = msg.sender;
    require(p > 1000000, "P deve ser maior que 1 milhao para seguranca");
    require(h < p, "H deve ser menor que P");
    require(g > 1 && g < p, "G deve estar entre 1 e P");
    emit ElGamalParametersSet(_p, _g, _h);
    }
    
    // ADICIONAR função para autorizar relayers:
    function authorizeRelayer(address relayer) public {
        require(msg.sender == admin, "Apenas admin");
        authorizedRelayers[relayer] = true;
    }

    // Função para submeter voto cifrado
    function submitEncryptedVote(
        uint256[] memory _c1_values,
        uint256[] memory _c2_values,
        address _voter
    ) public {
        require(authorizedRelayers[msg.sender], "Relayer nao autorizado");
        require(!hasVoted[_voter], "Eleitor ja votou!");
        require(_c1_values.length == numCandidates, "Numero incorreto de C1");
        require(_c2_values.length == numCandidates, "Numero incorreto de C2");
        
        // Validações
        for(uint i = 0; i < numCandidates; i++) {
            require(_c1_values[i] < p, "C1 invalido");
            require(_c2_values[i] < p, "C2 invalido");
        }
        
        EncryptedVote memory newVote = EncryptedVote({
            c1_values: _c1_values,
            c2_values: _c2_values,
            timestamp: block.timestamp,
            relayer: msg.sender,
            voter: _voter
        });
        
        encryptedVotes.push(newVote);
        hasVoted[_voter] = true;
        
        bytes32 txHash = keccak256(abi.encodePacked(blockhash(block.number - 1), msg.sender, block.timestamp));
        emit VoteSubmitted(txHash, _c1_values, _c2_values, block.timestamp, msg.sender);
    }
    
    // Função para obter o número total de votos
    function getTotalVotes() public view returns (uint256) {
        return encryptedVotes.length;
    }
    
    // Função para obter um voto específico
    function getVote(uint256 index) public view returns (
        uint256[] memory c1_values,
        uint256[] memory c2_values,
        uint256 timestamp,
        address relayer
    ) {
        require(index < encryptedVotes.length, "Indice invalido");
        EncryptedVote memory vote = encryptedVotes[index];
        return (vote.c1_values, vote.c2_values, vote.timestamp, vote.relayer);
    }
    
    // Função para obter todos os votos cifrados (para auditoria)
    function getAllEncryptedVotes() public view returns (EncryptedVote[] memory) {
        return encryptedVotes;
    }
    
    // Função para verificar se um endereço já votou
    function checkIfVoted(address voter) public view returns (bool) {
        return hasVoted[voter];
    }
}