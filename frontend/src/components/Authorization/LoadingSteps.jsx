import React from 'react';
import './LoadingSteps.css';

/**
 * Componente para exibir etapas do processo de autorizacao
 */
const LoadingSteps = ({ currentStep, steps }) => {
  return (
    <div className="loading-steps">
      {steps.map((step, index) => (
        <div 
          key={index}
          className={`step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
        >
          <div className="step-icon">
            {index < currentStep ? (
              <span className="checkmark">✓</span>
            ) : index === currentStep ? (
              <span className="spinner"></span>
            ) : (
              <span className="step-number">{index + 1}</span>
            )}
          </div>
          <div className="step-content">
            <div className="step-title">{step.title}</div>
            <div className="step-description">{step.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSteps;