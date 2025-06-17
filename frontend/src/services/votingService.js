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
      
      // Verificar se a votação está pausada ANTES de tentar votar
      try {
        const isPaused = await contract.votingPaused();
        if (isPaused) {
          throw new Error('A votação está temporariamente pausada');
        }
      } catch (checkError) {
        // Se falhar a verificação, continuar e deixar o contrato retornar o erro
        console.log('Não foi possível verificar status de pausa:', checkError);
      }
      
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
      
      // Extrair mensagem de erro de forma segura
      const errorMessage = error?.reason || error?.message || String(error);
      
      // Tratar erros específicos do contrato
      if (errorMessage.includes('A votacao esta pausada')) {
        throw new Error('A votação está temporariamente pausada');
      } else if (errorMessage.includes('Voce ja votou')) {
        throw new Error('Você já votou nesta eleição');
      } else if (errorMessage.includes('Voce nao tem direito a voto')) {
        throw new Error('Você não tem permissão para votar');
      } else if (errorMessage.includes('Proposta invalida')) {
        throw new Error('Candidato inválido');
      } else if (errorMessage.includes('user rejected')) {
        throw new Error('Transação cancelada pelo usuário');
      }
      
      // Para outros erros, retornar uma mensagem genérica
      throw new Error('Erro ao registrar voto. Por favor, tente novamente.');
    }
  },

  // Buscar resultados da eleição
  async getResults(contract) {
    try {
      if (!contract) throw new Error('Contrato não disponível');

      const candidates = await this.getCandidates(contract);
      const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);

      let winner = null;
      let maxVotes = 0;

      candidates.forEach(candidate => {
        if (candidate.voteCount > maxVotes) {
          maxVotes = candidate.voteCount;
          winner = candidate;
        }
      });

      const tiedCandidates = candidates.filter(c => c.voteCount === maxVotes);
      if (tiedCandidates.length > 1) {
        winner = null;
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
        timestamp: event.args.blockNumber
      }));

    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      throw error;
    }
  },

  // Pausar a votação
  async pauseVoting(contract) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      const tx = await contract.pauseVoting();
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Erro ao pausar votação:', error);
      
      // Tratamento seguro - converter para string antes de verificar
      const errorStr = String(error?.reason || error?.message || error || '');
      
      if (errorStr.indexOf('A votacao ja esta pausada') !== -1) {
        throw new Error('A votação já está pausada');
      } else if (errorStr.indexOf('Apenas o administrador') !== -1) {
        throw new Error('Apenas o administrador pode pausar a votação');
      }
      
      throw error;
    }
  },

  // Retomar a votação
  async resumeVoting(contract) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      const tx = await contract.resumeVoting();
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
      
    } catch (error) {
      console.error('Erro ao retomar votação:', error);
      
      // Tratamento seguro - converter para string antes de verificar
      const errorStr = String(error?.reason || error?.message || error || '');
      
      if (errorStr.indexOf('A votacao nao esta pausada') !== -1) {
        throw new Error('A votação não está pausada');
      } else if (errorStr.indexOf('Apenas o administrador') !== -1) {
        throw new Error('Apenas o administrador pode retomar a votação');
      }
      
      throw error;
    }
  },

  // Verificar se a votação está pausada
  async isVotingPaused(contract) {
    try {
      if (!contract) throw new Error('Contrato não disponível');
      
      // Usar o getter automático da variável pública votingPaused
      const isPaused = await contract.votingPaused();
      return Boolean(isPaused);
      
    } catch (error) {
      console.error('Erro ao verificar status da votação:', error);
      throw error;
    }
  }
};
