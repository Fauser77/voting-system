// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ElGamalVoting {
    struct EncryptedVote {
        uint256 c1_candidate1;
        uint256 c2_candidate1;
        uint256 c1_candidate2;
        uint256 c2_candidate2;
        address voter;
        uint256 timestamp;
    }
    
    // Array para armazenar todos os votos cifrados
    EncryptedVote[] public encryptedVotes;
    
    // Mapeamento para rastrear quem já votou
    mapping(address => bool) public hasVoted;
    
    // Parâmetros públicos do ElGamal (serão definidos no deploy)
    uint256 public p; // Primo grande
    uint256 public g; // Gerador
    uint256 public h; // Chave pública (g^x mod p)
    
    // Eventos para auditoria
    event VoteSubmitted(
        address indexed voter,
        uint256 c1_candidate1,
        uint256 c2_candidate1,
        uint256 c1_candidate2,
        uint256 c2_candidate2,
        uint256 timestamp
    );
    
    event ElGamalParametersSet(uint256 p, uint256 g, uint256 h);
    
    constructor(uint256 _p, uint256 _g, uint256 _h) {
        p = _p;
        g = _g;
        h = _h;
        emit ElGamalParametersSet(_p, _g, _h);
    }
    
    // Função para submeter voto cifrado
    function submitEncryptedVote(
        uint256 _c1_candidate1,
        uint256 _c2_candidate1,
        uint256 _c1_candidate2,
        uint256 _c2_candidate2
    ) public {
        require(!hasVoted[msg.sender], "Voce ja votou!");
        
        // Validações básicas
        require(_c1_candidate1 < p, "C1_candidate1 invalido");
        require(_c2_candidate1 < p, "C2_candidate1 invalido");
        require(_c1_candidate2 < p, "C1_candidate2 invalido");
        require(_c2_candidate2 < p, "C2_candidate2 invalido");
        
        // Armazena o voto cifrado
        EncryptedVote memory newVote = EncryptedVote({
            c1_candidate1: _c1_candidate1,
            c2_candidate1: _c2_candidate1,
            c1_candidate2: _c1_candidate2,
            c2_candidate2: _c2_candidate2,
            voter: msg.sender,
            timestamp: block.timestamp
        });
        
        encryptedVotes.push(newVote);
        hasVoted[msg.sender] = true;
        
        emit VoteSubmitted(
            msg.sender,
            _c1_candidate1,
            _c2_candidate1,
            _c1_candidate2,
            _c2_candidate2,
            block.timestamp
        );
    }
    
    // Função para obter o número total de votos
    function getTotalVotes() public view returns (uint256) {
        return encryptedVotes.length;
    }
    
    // Função para obter um voto específico
    function getVote(uint256 index) public view returns (
        uint256 c1_candidate1,
        uint256 c2_candidate1,
        uint256 c1_candidate2,
        uint256 c2_candidate2,
        address voter,
        uint256 timestamp
    ) {
        require(index < encryptedVotes.length, "Indice invalido");
        EncryptedVote memory vote = encryptedVotes[index];
        return (
            vote.c1_candidate1,
            vote.c2_candidate1,
            vote.c1_candidate2,
            vote.c2_candidate2,
            vote.voter,
            vote.timestamp
        );
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