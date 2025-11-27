import React, { useState } from 'react';
import { isValidAddress } from '../../utils/crypto';

const AddressAuthentication = ({ onSubmit, loading, error }) => {
  const [address, setAddress] = useState('');

  const handleAddressChange = (e) => {
    const value = e.target.value.trim();
    setAddress(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValidAddress(address)) {
      onSubmit(address);
    }
  };

  const handlePaste = (e) => {
    // Limpar espaços ao colar
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();
    setAddress(pastedText);
  };

  return (
    <form onSubmit={handleSubmit} className="voting-form">
      <div className="step-header">
        <h2>Identificação do Eleitor</h2>
        <p>Digite o endereço público gerado no seu cadastro</p>
      </div>

      <div className="form-group">
        <label htmlFor="address">Endereço Público (Ethereum):</label>
        <input
          type="text"
          id="address"
          value={address}
          onChange={handleAddressChange}
          onPaste={handlePaste}
          placeholder="0x..."
          disabled={loading}
          required
          className="address-input"
          spellCheck="false"
        />
        <small>Comece com "0x" seguido de 40 caracteres hexadecimais</small>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <button 
        type="submit" 
        className="submit-button"
        disabled={loading || !isValidAddress(address)}
      >
        {loading ? 'Verificando...' : 'Continuar'}
      </button>

      <div className="info-box">
        <strong>Onde encontrar seu endereço?</strong>
        <ul>
          <li>No arquivo de credenciais que você baixou no cadastro</li>
          <li>É o "Endereço Público" que começa com 0x</li>
          <li>Exemplo: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb</li>
        </ul>
      </div>

      <div className="warning-box">
        <strong>⚠️ Atenção:</strong>
        <p>
          Você precisará da sua <strong>chave privada</strong> na próxima etapa
          para assinar o voto. Tenha-a em mãos.
        </p>
      </div>
    </form>
  );
};

export default AddressAuthentication;