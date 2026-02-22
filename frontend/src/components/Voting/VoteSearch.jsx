import React, { useState } from 'react';
import './VoteSearch.css';

const TRUNC = 24;

const EncryptedValues = ({ encryptedValues }) => {
  const [expanded, setExpanded] = useState({});

  const toggle = (idx, field) => {
    setExpanded(prev => {
      const key = `${idx}-${field}`;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const isOpen = (idx, field) => !!expanded[`${idx}-${field}`];

  return (
    <div className="search-encrypted">
      <p className="vote-section-label" style={{ marginBottom: '0.75rem' }}>
        Valores criptografados (ElGamal)
      </p>
      {encryptedValues.map((item, idx) => (
        <div key={idx} className="search-encrypted__item">
          <strong>{item.candidate}</strong>
          <div className="search-encrypted__vals">
            {['c1', 'c2'].map(field => {
              const full = item[field];
              const open = isOpen(idx, field);
              return (
                <div key={field} className="search-encrypted__row">
                  <span className="search-encrypted__field">{field.toUpperCase()}:</span>
                  <span className={`search-encrypted__hex ${open ? 'search-encrypted__hex--expanded' : ''}`}>
                    {open ? full : `${full.substring(0, TRUNC)}…`}
                  </span>
                  <button
                    type="button"
                    className="search-encrypted__toggle"
                    onClick={() => toggle(idx, field)}
                  >
                    {open ? 'recolher' : 'ver completo'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const VoteSearch = ({ onClose }) => {
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voteInfo, setVoteInfo] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      setError('Hash inválido. Deve ter 66 caracteres (0x + 64 hex)');
      return;
    }
    setLoading(true); setError(''); setVoteInfo(null);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/voting/search/${txHash}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setVoteInfo(data.vote);
    } catch (err) {
      setError(err.message || 'Erro ao buscar voto');
    } finally { setLoading(false); }
  };

  const fmt = (iso) => new Date(iso).toLocaleString('pt-BR');

  return (
    <div className="search-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-modal">
        <div className="search-modal__header">
          <h2 className="search-modal__title">Consultar voto na blockchain</h2>
          <button className="search-modal__close" onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="form-group">
            <label className="form-label">Hash da transação</label>
            <input
              className="form-input"
              type="text"
              value={txHash}
              onChange={e => { setTxHash(e.target.value.trim()); setError(''); }}
              placeholder="0x..."
              disabled={loading}
              spellCheck={false}
              autoComplete="off"
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <p className="form-hint">Hash recebido ao votar (66 caracteres, começa com 0x)</p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading || !txHash.trim()}
          >
            {loading ? 'Buscando...' : 'Buscar voto'}
          </button>
        </form>

        {voteInfo && (
          <div className="search-result animate-in">
            <div className="divider" />

            <div className="search-result__success">
              Voto encontrado e verificado na blockchain
            </div>

            <div className="search-result__grid">
              <div className="search-result__item">
                <span className="search-result__label">Número do voto</span>
                <span className="search-result__value">#{voteInfo.voteIndex}</span>
              </div>
              <div className="search-result__item">
                <span className="search-result__label">Data e hora</span>
                <span className="search-result__value">{fmt(voteInfo.timestamp)}</span>
              </div>
              <div className="search-result__item">
                <span className="search-result__label">Bloco</span>
                <span className="search-result__value">#{voteInfo.blockNumber}</span>
              </div>
              <div className="search-result__item">
                <span className="search-result__label">Confirmações</span>
                <span className="search-result__value">
                  <span className="badge badge--green">{voteInfo.confirmations}</span>
                </span>
              </div>
            </div>

            <div className="search-result__hashes">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Hash da transação</label>
                <code className="search-hash font-mono break-all">{voteInfo.txHash}</code>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Hash do bloco</label>
                <code className="search-hash font-mono break-all">{voteInfo.blockHash}</code>
              </div>
            </div>

            <div className="alert alert--info" style={{ fontSize: '0.85rem' }}>
              <strong>🔐 Privacidade garantida:</strong> Os valores abaixo são criptografados com
              ElGamal e não revelam em quem você votou.
            </div>

            <EncryptedValues encryptedValues={voteInfo.encryptedValues} />
          </div>
        )}
      </div>
    </div>
  );
};

export default VoteSearch;