import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ElectionResultsPage.css';

const ElectionResultsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => { loadResults(); }, []);

  const loadResults = async () => {
    setLoading(true); setError('');
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/voting/results`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResults(data.results);
    } catch (err) {
      setError(err.message || 'Erro ao carregar resultados');
    } finally { setLoading(false); }
  };

  const getPct = (voteCount) => {
    if (!results || results.totalVotes === '0') return 0;
    return (parseInt(voteCount) / parseInt(results.totalVotes)) * 100;
  };

  const fmt = (iso) => new Date(iso).toLocaleString('pt-BR');

  const sorted = results?.candidates
    ? [...results.candidates].sort((a, b) => parseInt(b.voteCount) - parseInt(a.voteCount))
    : [];

  return (
    <div className="page-wrapper">
      <div className="gov-stripe" />
      <header className="gov-header">
        <div className="gov-header__brand">
          <div className="gov-header__logo">VB</div>
          <div>
            <span className="gov-header__title">Votação Blockchain</span>
            <span className="gov-header__subtitle">Sistema Eletrônico Seguro</span>
          </div>
        </div>
      </header>

      <div className="page-content animate-in">
        <div className="container">
          <button className="back-link" onClick={() => navigate('/')}>
            Voltar ao Menu
          </button>

          <div style={{ marginBottom: '2rem' }}>
            <h1 className="section-title">Resultados da Eleição</h1>
            <p className="section-subtitle">
              Apuração registrada e verificável na blockchain.
            </p>
          </div>

          {loading && (
            <div className="card results-loading">
              <div className="results-spinner" />
              <p>Carregando resultados...</p>
            </div>
          )}

          {error && !loading && (
            <div className="card card--elevated">
              <div className="alert alert--warning">
                <strong>Resultados indisponíveis</strong><br />
                {error}
              </div>
              <button className="btn btn--secondary" onClick={loadResults} type="button">
                Tentar novamente
              </button>
            </div>
          )}

          {results && !loading && (
            <>
              {/* Winner */}
              <div className="results-winner">
                
                <div>
                  <p className="results-winner__eyebrow">Vencedor</p>
                  <h2 className="results-winner__name">{results.winner}</h2>
                  {sorted[0] && (
                    <p className="results-winner__votes">
                      {sorted[0].voteCount} votos — {getPct(sorted[0].voteCount).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="results-stats">
                <div className="results-stat">
                  <p className="results-stat__value">{results.totalVotes}</p>
                  <p className="results-stat__label">Votos totais</p>
                </div>
                <div className="results-stat">
                  <p className="results-stat__value">{results.participation.authorized}</p>
                  <p className="results-stat__label">Eleitores autorizados</p>
                </div>
                <div className="results-stat">
                  <p className="results-stat__value">{results.participation.percentage}%</p>
                  <p className="results-stat__label">Participação</p>
                </div>
                <div className="results-stat">
                  <p className="results-stat__value" style={{ fontSize: '0.9rem' }}>{fmt(results.timestamp)}</p>
                  <p className="results-stat__label">Apurado em</p>
                </div>
              </div>

              {/* Candidatos */}
              <div className="card card--elevated">
                <p className="vote-section-label" style={{ marginBottom: '1.5rem' }}>
                  Votos por candidato
                </p>
                <div className="results-list">
                  {sorted.map((candidate, idx) => {
                    const isWinner = candidate.name === results.winner;
                    const pct = getPct(candidate.voteCount);
                    const medals = ['1º', '2º', '3º'];
                    return (
                      <div
                        key={idx}
                        className={`results-row ${isWinner ? 'results-row--winner' : ''}`}
                      >
                        <div className="results-row__medal">
                          {medals[idx] || `${idx + 1}°`}
                        </div>
                        <div className="results-row__info">
                          <p className="results-row__name">{candidate.name}</p>
                          <div className="results-row__bar-wrapper">
                            <div
                              className={`results-row__bar ${isWinner ? 'results-row__bar--winner' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="results-row__count">
                          <span className="results-row__votes">{candidate.voteCount}</span>
                          <span className="results-row__pct">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer de segurança */}
              <div className="results-security">
                
                <div>
                  <strong>Resultados verificáveis</strong>
                  <p>Apuração registrada permanentemente na blockchain — imutável e auditável por qualquer pessoa.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="gov-footer">
        <p>Sistema de Votação Eletrônica via Blockchain</p>
      </footer>
    </div>
  );
};

export default ElectionResultsPage;