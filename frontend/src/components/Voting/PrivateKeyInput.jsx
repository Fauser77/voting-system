import React, { useState } from 'react';

const PrivateKeyInput = ({ onSubmit, loading, error, onBack }) => {
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (privateKey.trim()) {
      onSubmit(privateKey.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="voting-form">
      <div className="step-header">
        <h2>Autenticação de Voto</h2>
        <p>Digite sua chave privada para assinar o voto</p>
      </div>

      <div className="form-group">
        <label htmlFor="privateKey">Chave Privada:</label>
        <div className="key-input-wrapper">
          <input
            type={showKey ? 'text' : 'password'}
            id="privateKey"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="0x..."
            disabled={loading}
            required
            className="key-input"
          />
          <button
            type="button"
            className="toggle-key-button"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        <small>Use a chave privada gerada durante seu cadastro</small>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="warning-box">
        <strong>⚠️ Segurança:</strong>
        <p>
          Sua chave privada é usada apenas para assinar o voto digitalmente.
          Ela não é enviada para o servidor e permanece apenas no seu navegador.
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
          type="submit" 
          className="submit-button"
          disabled={loading || !privateKey.trim()}
        >
          {loading ? 'Validando...' : 'Continuar'}
        </button>
      </div>
    </form>
  );
};

export default PrivateKeyInput;