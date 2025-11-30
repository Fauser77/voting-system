import React, { useState } from 'react';

const VoteSearch = ({ onClose }) => {
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voteInfo, setVoteInfo] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!txHash.trim() || !txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      setError('Hash de transação inválido. Deve ter 66 caracteres (0x + 64 hex)');
      return;
    }

    setLoading(true);
    setError('');
    setVoteInfo(null);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/voting/search/${txHash}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setVoteInfo(data.vote);
    } catch (err) {
      setError(err.message || 'Erro ao buscar voto');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateHash = (hash) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div className="vote-search-container">
      <div className="vote-search-modal">
        <div className="modal-header">
          <h2>🔍 Consultar Voto</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label htmlFor="txHash">Hash da Transação:</label>
            <input
              type="text"
              id="txHash"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value.trim())}
              placeholder="0x..."
              disabled={loading}
              className="tx-hash-input"
            />
            <small>Cole o hash da transação do seu voto (começa com 0x)</small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading || !txHash.trim()}
          >
            {loading ? 'Buscando...' : 'Buscar Voto'}
          </button>
        </form>

        {voteInfo && (
          <div className="vote-info">
            <div className="success-header">
              <span className="success-icon">✅</span>
              <h3>Voto Encontrado!</h3>
            </div>

            <div className="info-section">
              <div className="info-item">
                <label>Número do Voto:</label>
                <span className="info-value">#{voteInfo.voteIndex}</span>
              </div>

              <div className="info-item">
                <label>Data e Hora:</label>
                <span className="info-value">{formatDate(voteInfo.timestamp)}</span>
              </div>

              <div className="info-item">
                <label>Bloco:</label>
                <span className="info-value">#{voteInfo.blockNumber}</span>
              </div>

              <div className="info-item">
                <label>Confirmações:</label>
                <span className="info-value badge">{voteInfo.confirmations}</span>
              </div>
            </div>

            <div className="technical-section">
              <h4>Informações Técnicas</h4>
              
              <div className="info-item">
                <label>Hash da Transação:</label>
                <code className="hash-code">{voteInfo.txHash}</code>
              </div>

              <div className="info-item">
                <label>Hash do Bloco:</label>
                <code className="hash-code">{voteInfo.blockHash}</code>
              </div>

              <div className="info-item">
                <label>Relayer:</label>
                <code className="hash-code">{truncateHash(voteInfo.relayer)}</code>
              </div>
            </div>

            <div className="encrypted-section">
              <h4>🔐 Valores Criptografados (ElGamal)</h4>
              <p className="encrypted-note">
                Seu voto está protegido por criptografia ElGamal. Os valores abaixo 
                garantem total privacidade e não revelam em quem você votou.
              </p>
              
              {voteInfo.encryptedValues.map((item, idx) => (
                <div key={idx} className="candidate-encrypted">
                  <strong>{item.candidate}:</strong>
                  <div className="encrypted-values">
                    <div>C1: {item.c1.substring(0, 20)}...</div>
                    <div>C2: {item.c2.substring(0, 20)}...</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="security-note">
              <strong>🔒 Nota de Segurança:</strong>
              <p>
                Este registro é imutável e permanente na blockchain. 
                Seu voto foi contabilizado e não pode ser alterado ou removido.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoteSearch;