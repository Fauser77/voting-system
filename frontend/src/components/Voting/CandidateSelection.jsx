import React, { useState } from 'react';

const CandidateSelection = ({ candidates, onSelect, onBack }) => {
  const [selected, setSelected] = useState(null);

  const handleSelect = (candidate) => {
    setSelected(candidate);
  };

  const handleContinue = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="voting-form">
      <div className="step-header">
        <h2>Escolha seu Candidato</h2>
        <p>Selecione o candidato de sua preferência</p>
      </div>

      <div className="candidates-list">
        {candidates.map((candidate) => (
          <div
            key={candidate.index}
            className={`candidate-card ${selected?.index === candidate.index ? 'selected' : ''}`}
            onClick={() => handleSelect(candidate)}
          >
            <div className="candidate-number">{candidate.index + 1}</div>
            <div className="candidate-info">
              <h3>{candidate.name}</h3>
              <p>Candidato {candidate.index + 1}</p>
            </div>
            <div className="candidate-radio">
              <input
                type="radio"
                name="candidate"
                checked={selected?.index === candidate.index}
                onChange={() => {}}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="button-group">
        <button 
          type="button" 
          className="back-button"
          onClick={onBack}
        >
          Voltar
        </button>
        <button 
          type="button" 
          className="submit-button"
          disabled={!selected}
          onClick={handleContinue}
        >
          Continuar
        </button>
      </div>
    </div>
  );
};

export default CandidateSelection;