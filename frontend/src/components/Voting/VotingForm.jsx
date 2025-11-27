import React, { useState } from 'react';
import { votingService } from '../../services/votingApi';
import { encryptVote, validateEncryptedVote } from '../../utils/elgamal';
import { signVoteData, validatePrivateKey } from '../../utils/signature';
import AddressAuthentication from './AddressAuthentication';
import CandidateSelection from './CandidateSelection';
import PrivateKeyInput from './PrivateKeyInput';
import VoteConfirmation from './VoteConfirmation';
import VoteSuccess from './VoteSuccess';
import './VotingForm.css';

const STEPS = {
  ADDRESS_AUTH: 0,
  CANDIDATE_SELECT: 1,
  PRIVATE_KEY: 2,
  CONFIRMATION: 3,
  SUCCESS: 4
};

const VotingForm = () => {
  const [currentStep, setCurrentStep] = useState(STEPS.ADDRESS_AUTH);
  const [voterAddress, setVoterAddress] = useState('');
  const [voterData, setVoterData] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const handleAddressSubmit = async (address) => {
    setLoading(true);
    setError('');

    try {
      const result = await votingService.authenticateVoter(address);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      setVoterAddress(address);
      setVoterData({
        address: result.voterAddress,
        candidates: result.candidates,
        elgamalParams: result.elgamalParams
      });
      
      setCurrentStep(STEPS.CANDIDATE_SELECT);
    } catch (err) {
      setError(err.message || 'Erro ao autenticar endereço');
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate);
    setCurrentStep(STEPS.PRIVATE_KEY);
  };

  const handlePrivateKeySubmit = async (pkValue) => {
    setLoading(true);
    setError('');

    try {
      // Validar chave privada
      const validation = validatePrivateKey(pkValue);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Verificar se o endereço corresponde
      if (validation.address.toLowerCase() !== voterAddress.toLowerCase()) {
        throw new Error('Esta chave privada não corresponde ao endereço fornecido. Verifique se está usando a chave correta gerada no cadastro.');
      }

      setPrivateKey(pkValue);
      setCurrentStep(STEPS.CONFIRMATION);
    } catch (err) {
      setError(err.message || 'Erro ao validar chave privada');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVote = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Cifrando voto...');
      
      // Cifrar voto com ElGamal
      const { c1_values, c2_values } = encryptVote(
        selectedCandidate.index,
        voterData.candidates.length,
        voterData.elgamalParams
      );

      // Validar cifragem
      const validation = validateEncryptedVote(
        c1_values,
        c2_values,
        voterData.candidates.length,
        voterData.elgamalParams.p
      );

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      console.log('✍️ Assinando voto...');
      
      // Assinar voto
      const signature = await signVoteData(
        { c1_values, c2_values },
        privateKey
      );

      console.log('📤 Enviando voto...');
      
      // Submeter voto
      const result = await votingService.submitVote(
        voterAddress,
        c1_values,
        c2_values,
        signature
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      setTxHash(result.transactionHash);
      setCurrentStep(STEPS.SUCCESS);
      
      // Limpar dados sensíveis
      setPrivateKey('');
    } catch (err) {
      console.error('Erro ao registrar voto:', err);
      setError(err.message || 'Erro ao registrar voto');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setVoterAddress('');
    setVoterData(null);
    setSelectedCandidate(null);
    setPrivateKey('');
    setError('');
    setTxHash('');
    setCurrentStep(STEPS.ADDRESS_AUTH);
  };

  return (
    <div className="voting-container">
      <div className="voting-card">
        <div className="header">
          <h1>Votação Eletrônica</h1>
          <p>Sistema Seguro de Votação via Blockchain</p>
        </div>

        {currentStep === STEPS.ADDRESS_AUTH && (
          <AddressAuthentication
            onSubmit={handleAddressSubmit}
            loading={loading}
            error={error}
          />
        )}

        {currentStep === STEPS.CANDIDATE_SELECT && (
          <CandidateSelection
            candidates={voterData.candidates}
            onSelect={handleCandidateSelect}
            onBack={handleReset}
          />
        )}

        {currentStep === STEPS.PRIVATE_KEY && (
          <PrivateKeyInput
            onSubmit={handlePrivateKeySubmit}
            loading={loading}
            error={error}
            onBack={() => setCurrentStep(STEPS.CANDIDATE_SELECT)}
          />
        )}

        {currentStep === STEPS.CONFIRMATION && (
          <VoteConfirmation
            candidate={selectedCandidate}
            onConfirm={handleConfirmVote}
            onBack={() => {
              setPrivateKey('');
              setCurrentStep(STEPS.PRIVATE_KEY);
            }}
            loading={loading}
            error={error}
          />
        )}

        {currentStep === STEPS.SUCCESS && (
          <VoteSuccess
            txHash={txHash}
            candidate={selectedCandidate}
            onClose={handleReset}
          />
        )}
      </div>

      <footer className="footer">
        <p>Sistema de Votação Eletrônica via Blockchain</p>
        <p>Seu voto é criptografado e anônimo</p>
      </footer>
    </div>
  );
};

export default VotingForm;