import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authorizationService } from '../../services/api';
import { generateKeyPair, cleanCPF, formatCPF } from '../../utils/crypto';
import KeyDisplay from './KeyDisplay';
import './AuthorizationForm.css';

const STEPS = [
  { id: 0, label: 'Validando CPF', desc: 'Verificando autorização...' },
  { id: 1, label: 'Verificando blockchain', desc: 'Consultando registro...' },
  { id: 2, label: 'Gerando credenciais', desc: 'Criando chaves criptográficas...' },
  { id: 3, label: 'Registrando', desc: 'Salvando na blockchain...' },
  { id: 4, label: 'Concluído', desc: 'Registro finalizado!' },
];

const AuthorizationForm = () => {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(-1);
  const [keyPair, setKeyPair] = useState(null);
  const [showKeys, setShowKeys] = useState(false);

  const handleCPFChange = (e) => {
    const cleaned = cleanCPF(e.target.value).substring(0, 11);
    setCpf(cleaned);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cpf.length !== 11) { setError('CPF deve ter 11 dígitos'); return; }

    setLoading(true);
    setError('');
    setCurrentStep(0);

    try {
      const validationResult = await authorizationService.validateCPF(cpf);
      if (!validationResult.success) throw new Error(validationResult.error);
      const cpfHash = validationResult.cpfHash;

      setCurrentStep(2);
      await sleep(400);
      const keys = generateKeyPair();
      setKeyPair(keys);

      setCurrentStep(3);
      const registerResult = await authorizationService.registerVoter(keys.address, cpfHash);
      if (!registerResult.success) throw new Error(registerResult.error);

      setCurrentStep(4);
      await sleep(800);
      setShowKeys(true);
    } catch (err) {
      setError(err.message || 'Erro desconhecido. Tente novamente.');
      setCurrentStep(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCpf(''); setError(''); setCurrentStep(-1); setKeyPair(null); setShowKeys(false);
  };

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
            <h1 className="section-title">Registro de Eleitor</h1>
            <p className="section-subtitle">
              Informe seu CPF para validar seu acesso e gerar suas credenciais de votação.
            </p>
          </div>

          {!loading && !showKeys && (
            <div className="card card--elevated">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="cpf">CPF</label>
                  <input
                    className="form-input"
                    type="text"
                    id="cpf"
                    value={formatCPF(cpf)}
                    onChange={handleCPFChange}
                    placeholder="000.000.000-00"
                    maxLength="14"
                    disabled={loading}
                    required
                    autoComplete="off"
                  />
                  <p className="form-hint">Digite apenas os números do seu CPF</p>
                </div>

                {error && (
                  <div className="alert alert--error">{error}</div>
                )}

                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                  disabled={loading || cpf.length !== 11}
                >
                  Gerar credenciais de votação
                </button>
              </form>

              <div className="divider" />

              <div className="auth-info">
                <p className="auth-info__title">Como funciona</p>
                <ul className="auth-info__list">
                  <li>Seu CPF é verificado na lista de eleitores autorizados</li>
                  <li>Suas chaves criptográficas são geradas localmente no seu navegador</li>
                  <li>Seu endereço público é registrado na blockchain</li>
                  <li>Guarde sua chave privada — ela não pode ser recuperada</li>
                </ul>
              </div>
            </div>
          )}

          {loading && (
            <div className="card card--elevated">
              <div className="steps-container">
                {STEPS.map((step) => {
                  const isActive = step.id === currentStep;
                  const isDone = step.id < currentStep;
                  return (
                    <div
                      key={step.id}
                      className={`step-item ${isActive ? 'step-item--active' : ''} ${isDone ? 'step-item--done' : ''}`}
                    >
                      <div className="step-icon">
                        {isDone ? '✓' : isActive ? <span className="spinner-sm" /> : step.id + 1}
                      </div>
                      <div>
                        <p className="step-label">{step.label}</p>
                        {isActive && <p className="step-desc">{step.desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showKeys && keyPair && (
            <KeyDisplay
              privateKey={keyPair.privateKey}
              address={keyPair.address}
              onClose={handleReset}
            />
          )}
        </div>
      </div>

      <footer className="gov-footer">
        <p>Sistema de Votação Eletrônica via Blockchain</p>
      </footer>
    </div>
  );
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default AuthorizationForm;