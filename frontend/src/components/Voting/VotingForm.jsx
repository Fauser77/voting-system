import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { votingService } from '../../services/votingApi';
import { encryptVote, validateEncryptedVote } from '../../utils/elgamal';
import { signVoteData, validatePrivateKey } from '../../utils/signature';
import VoteSearch from './VoteSearch';
import './VotingForm.css';

const STEPS = { ADDRESS: 0, CANDIDATE: 1, PRIVATE_KEY: 2, CONFIRM: 3, SUCCESS: 4 };

const VotingForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.ADDRESS);
  const [voterAddress, setVoterAddress] = useState('');
  const [voterData, setVoterData] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [privateKey, setPrivateKey] = useState('');
  const [showPK, setShowPK] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const stepLabels = ['Identificação', 'Candidato', 'Autenticação', 'Confirmação'];
  const currentStepIndex = step < STEPS.SUCCESS ? step : 3;

  /* ---- Step 0: address auth ---- */
  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await votingService.authenticateVoter(voterAddress);
      if (!result.success) throw new Error(result.error);
      setVoterData({ candidates: result.candidates, elgamalParams: result.elgamalParams });
      setStep(STEPS.CANDIDATE);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  /* ---- Step 2: private key ---- */
  const handlePrivateKeySubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const v = validatePrivateKey(privateKey);
      if (!v.valid) throw new Error(v.error);
      if (v.address.toLowerCase() !== voterAddress.toLowerCase())
        throw new Error('Esta chave privada não corresponde ao endereço informado.');
      setStep(STEPS.CONFIRM);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  /* ---- Step 3: confirm vote ---- */
  const handleConfirmVote = async () => {
    setLoading(true); setError('');
    try {
      const { c1_values, c2_values } = encryptVote(
        selectedCandidate.index,
        voterData.candidates.length,
        voterData.elgamalParams
      );
      const validation = validateEncryptedVote(c1_values, c2_values, voterData.candidates.length, voterData.elgamalParams.p);
      if (!validation.valid) throw new Error(validation.error);

      const signature = await signVoteData({ c1_values, c2_values }, privateKey);
      const result = await votingService.submitVote(voterAddress, c1_values, c2_values, signature);
      if (!result.success) throw new Error(result.error);

      setTxHash(result.transactionHash);
      setPrivateKey('');
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setStep(STEPS.ADDRESS); setVoterAddress(''); setVoterData(null);
    setSelectedCandidate(null); setPrivateKey(''); setError(''); setTxHash('');
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
            <h1 className="section-title">Votação</h1>
            <p className="section-subtitle">Registre seu voto de forma segura e anônima.</p>
          </div>

          {/* Step indicator */}
          {step < STEPS.SUCCESS && (
            <div className="vote-steps">
              {stepLabels.map((label, i) => (
                <div key={i} className={`vote-step ${i === currentStepIndex ? 'vote-step--active' : i < currentStepIndex ? 'vote-step--done' : ''}`}>
                  <div className="vote-step__dot">
                    {i < currentStepIndex ? '✓' : i + 1}
                  </div>
                  <span className="vote-step__label">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* --- STEP 0: Endereço --- */}
          {step === STEPS.ADDRESS && (
            <div className="card card--elevated">
              <form onSubmit={handleAddressSubmit}>
                <div className="form-group">
                  <label className="form-label">Endereço Público (Ethereum)</label>
                  <input
                    className="form-input"
                    type="text"
                    value={voterAddress}
                    onChange={e => { setVoterAddress(e.target.value.trim()); setError(''); }}
                    placeholder="0x..."
                    disabled={loading}
                    spellCheck={false}
                    autoComplete="off"
                    required
                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  />
                  <p className="form-hint">
                    Endereço gerado durante o cadastro — começa com 0x
                  </p>
                </div>

                {error && <div className="alert alert--error">{error}</div>}

                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                  disabled={loading || !voterAddress.match(/^0x[a-fA-F0-9]{40}$/)}
                >
                  {loading ? 'Verificando...' : 'Continuar'}
                </button>
              </form>

              <div className="divider" />
              <button
                className="vote-search-trigger"
                type="button"
                onClick={() => setShowSearch(true)}
              >
                🔍 Consultar voto existente na blockchain
              </button>
            </div>
          )}

          {/* --- STEP 1: Candidato --- */}
          {step === STEPS.CANDIDATE && voterData && (
            <div className="card card--elevated">
              <p className="vote-section-label">Selecione o candidato</p>
              <div className="candidates-list">
                {voterData.candidates.map((c) => (
                  <label
                    key={c.index}
                    className={`candidate-option ${selectedCandidate?.index === c.index ? 'candidate-option--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="candidate"
                      checked={selectedCandidate?.index === c.index}
                      onChange={() => setSelectedCandidate(c)}
                    />
                    <div className="candidate-option__number">{c.index + 1}</div>
                    <div className="candidate-option__name">{c.name}</div>
                    <div className="candidate-option__check">
                      {selectedCandidate?.index === c.index ? '●' : '○'}
                    </div>
                  </label>
                ))}
              </div>

              <div className="vote-buttons">
                <button className="btn btn--secondary" onClick={handleReset} type="button">Voltar</button>
                <button
                  className="btn btn--primary"
                  disabled={!selectedCandidate}
                  onClick={() => setStep(STEPS.PRIVATE_KEY)}
                  type="button"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* --- STEP 2: Chave privada --- */}
          {step === STEPS.PRIVATE_KEY && (
            <div className="card card--elevated">
              <form onSubmit={handlePrivateKeySubmit}>
                <div className="alert alert--info" style={{ marginBottom: '1.5rem' }}>
                  <strong>Segurança:</strong> Sua chave privada é usada apenas localmente para
                  assinar o voto. Ela nunca é enviada ao servidor.
                </div>

                <div className="form-group">
                  <label className="form-label">Chave Privada</label>
                  <div className="pk-input-wrapper">
                    <input
                      className="form-input"
                      type={showPK ? 'text' : 'password'}
                      value={privateKey}
                      onChange={e => { setPrivateKey(e.target.value); setError(''); }}
                      placeholder="0x..."
                      disabled={loading}
                      required
                      style={{ fontFamily: 'monospace', paddingRight: '5rem' }}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="pk-toggle"
                      onClick={() => setShowPK(!showPK)}
                    >
                      {showPK ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <p className="form-hint">
                    Sua chave privada foi gerada durante o registro
                  </p>
                </div>

                {error && <div className="alert alert--error">{error}</div>}

                <div className="vote-buttons">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => { setStep(STEPS.CANDIDATE); setError(''); }}
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={loading || !privateKey.trim()}
                  >
                    {loading ? 'Validando...' : 'Continuar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --- STEP 3: Confirmar --- */}
          {step === STEPS.CONFIRM && selectedCandidate && (
            <div className="card card--elevated">
              <div className="confirm-candidate">
                <p className="confirm-candidate__label">Você está votando em</p>
                <div className="confirm-candidate__number">{selectedCandidate.index + 1}</div>
                <h2 className="confirm-candidate__name">{selectedCandidate.name}</h2>
              </div>

              <div className="alert alert--warning">
                <strong>⚠ Atenção:</strong> Após confirmar, seu voto é registrado permanentemente
                na blockchain e não pode ser alterado.
              </div>

              {error && <div className="alert alert--error">{error}</div>}

              {loading && (
                <div className="confirm-loading">
                  <div className="confirm-loading__item confirm-loading__item--active">
                    <span className="spinner-sm" style={{ display: 'inline-block' }} /> Cifrando voto com ElGamal...
                  </div>
                  <div className="confirm-loading__item">Assinando digitalmente...</div>
                  <div className="confirm-loading__item">Enviando para blockchain...</div>
                </div>
              )}

              <div className="vote-buttons" style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => { setStep(STEPS.PRIVATE_KEY); setError(''); setPrivateKey(''); }}
                  disabled={loading}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  className="btn btn--success"
                  onClick={handleConfirmVote}
                  disabled={loading}
                >
                  {loading ? 'Registrando...' : 'Confirmar voto'}
                </button>
              </div>
            </div>
          )}

          {/* --- STEP 4: Sucesso --- */}
          {step === STEPS.SUCCESS && (
            <div className="card card--elevated animate-in">
              <div className="success-header">
                <div className="success-header__icon">✓</div>
                <h2 className="success-header__title">Voto registrado!</h2>
                <p className="success-header__sub">
                  Seu voto foi cifrado, assinado e gravado permanentemente na blockchain.
                </p>
              </div>

              <div className="divider" />

              <div className="success-facts">
                <div className="success-fact">
                  <span>🔒</span> Cifrado com ElGamal
                </div>
                <div className="success-fact">
                  <span>✍️</span> Assinado digitalmente
                </div>
                <div className="success-fact">
                  <span>⛓️</span> Gravado na blockchain
                </div>
                <div className="success-fact">
                  <span>🎭</span> Voto anônimo e secreto
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Hash da Transação</label>
                <div className="key-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--color-gray-50)', border: '1px solid var(--color-gray-200)', borderRadius: '4px' }}>
                  <code className="font-mono break-all" style={{ flex: 1, fontSize: '0.78rem' }}>{txHash}</code>
                  <button
                    className="btn btn--secondary"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(txHash)}
                    style={{ flexShrink: 0 }}
                  >
                    Copiar
                  </button>
                </div>
                <p className="form-hint">Guarde este hash para verificar seu voto na blockchain</p>
              </div>

              <div className="vote-buttons" style={{ marginTop: '1.5rem' }}>
                <button
                  className="btn btn--secondary"
                  type="button"
                  onClick={() => setShowSearch(true)}
                >
                  🔍 Verificar meu voto
                </button>
                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={handleReset}
                >
                  Voltar ao início
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="gov-footer">
        <p>Sistema de Votação Eletrônica via Blockchain</p>
      </footer>

      {showSearch && <VoteSearch onClose={() => setShowSearch(false)} />}
    </div>
  );
};

export default VotingForm;