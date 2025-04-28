// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    // Estrutura para representar um candidato
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }
    
    // Armazena contas que já votaram
    mapping(address => bool) public voters;
    
    // Armazena os candidatos
    mapping(uint => Candidate) public candidates;
    
    // Número de candidatos
    uint public candidatesCount;
    
    // Evento quando um voto é registrado
    event VotedEvent(uint indexed _candidateId);
    
    constructor() {
        // Inicializa alguns candidatos para teste
        addCandidate("Candidato 1");
        addCandidate("Candidato 2");
    }
    
    function addCandidate(string memory _name) private {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }
    
    function vote(uint _candidateId) public {
        // Requer que o eleitor ainda não tenha votado
        require(!voters[msg.sender], "Voce ja votou.");
        
        // Requer um candidato válido
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Candidato invalido.");
        
        // Registra que o eleitor votou
        voters[msg.sender] = true;
        
        // Incrementa o número de votos do candidato
        candidates[_candidateId].voteCount++;
        
        // Ativa o evento
        emit VotedEvent(_candidateId);
    }
}