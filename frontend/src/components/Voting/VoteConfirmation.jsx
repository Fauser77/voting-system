import React from 'react';

const VoteConfirmation = ({ candidate, onConfirm, onBack, loading, error }) => {
  return (
    <div className="voting-form">
      <div className="step-header">
        <h2>Confirmar Voto</h2>
        <p>Revise sua escolha antes de confirmar</p>
      </div>

      <div className="confirmation-card">
        <div className="confirmation-icon">🗳️</div>
        <h3>Você está votando em:</h3>
        <div className="selected-candidate">
          <div className="candidate-number-large">{candidate.index + 1}</div>
          <h2>{candidate.name}</h2>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="warning-box critical">
        <strong>⚠️ ATENÇÃO:</strong>
        <p>
          Após confirmar, seu voto será registrado permanentemente na blockchain
          e NÃO PODERÁ ser alterado. Certifique-se de sua escolha.
        </p>
      </div>

      <div className="button-group">
        <button 
          type="button" 
          className="back-button"
          onClick={onBack}
          disabled={loading}
        >
          Voltar
        </button>
        <button 
          type="button" 
          className="confirm-button"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Registrando Voto...' : 'Confirmar Voto'}
        </button>
      </div>

      {loading && (
        <div className="loading-steps">
          <div className="step active">
            <span className="spinner"></span>
            <span>Cifrando voto com ElGamal...</span>
          </div>
          <div className="step">
            <span>Assinando digitalmente...</span>
          </div>
          <div className="step">
            <span>Enviando para blockchain...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoteConfirmation;