import React, { useState, useEffect } from 'react';
import './ElectionResults.css';

const ElectionResults = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/voting/results`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setResults(data.results);
    } catch (err) {
      setError(err.message || 'Erro ao carregar resultados');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (voteCount) => {
    if (!results || results.totalVotes === '0') return 0;
    return (parseInt(voteCount) / parseInt(results.totalVotes)) * 100;
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

  if (loading) {
    return (
      <div className="results-container">
        <div className="results-modal">
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Carregando resultados da eleição...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-container">
        <div className="results-modal">
          <div className="modal-header">
            <h2>📊 Resultados da Eleição</h2>
            <button onClick={onClose} className="close-button">✕</button>
          </div>
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <h3>Resultados Indisponíveis</h3>
            <p>{error}</p>
            <button onClick={onClose} className="submit-button">
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="results-modal large">
        <div className="modal-header">
          <h2>📊 Resultados Finais da Eleição</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        {/* Winner Banner */}
        <div className="winner-banner">
          <div className="trophy-icon">🏆</div>
          <div className="winner-info">
            <h3>Vencedor(a)</h3>
            <h2>{results.winner.name}</h2>
            <p className="winner-votes">
              {results.winner.voteCount} votos ({getProgressPercentage(results.winner.voteCount).toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🗳️</div>
            <div className="stat-content">
              <h4>Total de Votos</h4>
              <p className="stat-value">{results.totalVotes}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h4>Eleitores Autorizados</h4>
              <p className="stat-value">{results.participation.authorized}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <h4>Participação</h4>
              <p className="stat-value">{results.participation.percentage}%</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <h4>Apuração</h4>
              <p className="stat-value small">{formatDate(results.timestamp)}</p>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="results-section">
          <h3>Votos por Candidato</h3>
          
          <div className="candidates-results">
            {results.candidates
              .sort((a, b) => parseInt(b.voteCount) - parseInt(a.voteCount))
              .map((candidate, index) => {
                const isWinner = candidate.name === results.winner.name;
                const percentage = getProgressPercentage(candidate.voteCount);
                
                return (
                  <div 
                    key={candidate.index} 
                    className={`candidate-result ${isWinner ? 'winner' : ''}`}
                  >
                    <div className="candidate-header">
                      <div className="candidate-position">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                      </div>
                      <div className="candidate-details">
                        <h4>{candidate.name}</h4>
                        <p>Candidato {candidate.index + 1}</p>
                      </div>
                      <div className="candidate-votes">
                        <span className="votes-number">{candidate.voteCount}</span>
                        <span className="votes-label">votos</span>
                      </div>
                    </div>
                    
                    <div className="progress-bar-container">
                      <div 
                        className={`progress-bar ${isWinner ? 'winner' : ''}`}
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="percentage-label">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Footer Info */}
        <div className="results-footer">
          <div className="security-badge">
            <span className="badge-icon">🔒</span>
            <div className="badge-text">
              <strong>Resultados Verificáveis</strong>
              <p>Apuração registrada permanentemente na blockchain</p>
            </div>
          </div>
          
          <button onClick={onClose} className="close-results-button">
            Fechar Resultados
          </button>
        </div>
      </div>
    </div>
  );
};

export default ElectionResults;