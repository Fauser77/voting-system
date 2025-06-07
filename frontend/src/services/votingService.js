import { ethers } from 'ethers';

export const votingService = {
  // Buscar lista de candidatos
  async getCandidates(contract) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      const candidateCount = await contract.getProposalCount();
      const candidates = [];
      
      for (let i = 0; i < candidateCount; i++) {
        const candidate = await contract.getCandidate(i);
        candidates.push({
          index: i,
          name: candidate[0],
          voteCount: Number(candidate[1])
        });
      }
      
      return candidates;
    } catch (error) {
      console.error('Erro ao buscar candidatos:', error);
      throw error;
    }
  },

  // Registrar voto
  async vote(contract, candidateIndex) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      // Validar índice do candidato
      const candidateCount = await contract.getProposalCount();
      if (candidateIndex < 0 || candidateIndex >= candidateCount) {
        throw new Error('Candidato inválido');
      }
      
      // Registrar o voto
      const tx = await contract.vote(candidateIndex);
      console.log('Transação enviada:', tx.hash);
      
      // Aguardar confirmação
      const receipt = await tx.wait();
      console.log('Transação confirmada:', receipt);
      
      // Buscar evento VoteCast da transação
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'VoteCast';
        } catch (e) {
          return false;
        }
      });
      
      if (event) {
        const parsedEvent = contract.interface.parseLog(event);
        console.log('Voto registrado:', parsedEvent.args);
      }
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Erro ao votar:', error);
      
      // Tratar erros específicos
      if (error.message.includes('Voce ja votou')) {
        throw new Error('Você já votou nesta eleição');
      } else if (error.message.includes('Voce nao tem direito a voto')) {
        throw new Error('Você não tem permissão para votar');
      } else if (error.message.includes('Proposta invalida')) {
        throw new Error('Candidato inválido');
      }
      
      throw error;
    }
  },

  // Buscar resultados da eleição
  async getResults(contract) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      // Buscar todos os candidatos
      const candidates = await this.getCandidates(contract);
      
      // Calcular total de votos
      const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
      
      // Encontrar o vencedor
      let winner = null;
      let maxVotes = 0;
      
      candidates.forEach(candidate => {
        if (candidate.voteCount > maxVotes) {
          maxVotes = candidate.voteCount;
          winner = candidate;
        }
      });
      
      // Verificar empate
      const tiedCandidates = candidates.filter(c => c.voteCount === maxVotes);
      if (tiedCandidates.length > 1) {
        winner = null; // Indica empate
      }
      
      return {
        candidates,
        totalVotes,
        winner
      };
      
    } catch (error) {
      console.error('Erro ao buscar resultados:', error);
      throw error;
    }
  },

  // Verificar status do eleitor
  async getVoterInfo(contract, address) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      const voter = await contract.voters(address);
      
      return {
        hasRightToVote: voter.hasRightToVote,
        hasVoted: voter.isVoted,
        vote: voter.vote,
        address: voter.ID
      };
      
    } catch (error) {
      console.error('Erro ao buscar informações do eleitor:', error);
      throw error;
    }
  },

  // Verificar se é o chairperson
  async isChairperson(contract, address) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      const chairperson = await contract.chairPerson();
      return chairperson.toLowerCase() === address.toLowerCase();
      
    } catch (error) {
      console.error('Erro ao verificar chairperson:', error);
      throw error;
    }
  },

  // Buscar eventos de votação
  async getVotingEvents(contract, fromBlock = 0) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      const filter = contract.filters.VoteCast();
      const events = await contract.queryFilter(filter, fromBlock);
      
      return events.map(event => ({
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        candidateName: event.args.candidateName,
        timestamp: event.args.blockNumber // O evento inclui o blockNumber
      }));
      
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      throw error;
    }
  }
};