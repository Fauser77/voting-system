import React from 'react';

const VoteSuccess = ({ txHash, candidate, onClose }) => {
  const handleCopyTxHash = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      alert('Hash da transação copiado!');
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <div className="voting-form success-screen">
      <div className="success-icon">✅</div>
      
      <h2>Voto Registrado com Sucesso!</h2>
      
      <div className="success-details">
        <p>Você votou em:</p>
        <div className="voted-candidate">
          <strong>{candidate.name}</strong>
        </div>
      </div>

      <div className="transaction-info">
        <label>Hash da Transação:</label>
        <div className="tx-hash-display">
          <code>{txHash}</code>
          <button onClick={handleCopyTxHash} className="copy-button">
            Copiar
          </button>
        </div>
        <small>Guarde este hash para verificar seu voto na blockchain</small>
      </div>

      <div className="success-message">
        <p>
          ✓ Seu voto foi criptografado com ElGamal<br/>
          ✓ Assinado digitalmente com sua chave privada<br/>
          ✓ Registrado permanentemente na blockchain<br/>
          ✓ Seu voto é secreto e não pode ser rastreado
        </p>
      </div>

      <button 
        className="submit-button"
        onClick={onClose}
      >
        Concluir
      </button>

      <div className="info-box">
        <strong>Obrigado por participar!</strong>
        <p>
          Seu voto foi registrado com segurança e contribui para a
          transparência do processo democrático.
        </p>
      </div>
    </div>
  );
};

export default VoteSuccess;