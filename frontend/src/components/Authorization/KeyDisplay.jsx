import React, { useState } from 'react';
import { copyToClipboard } from '../../utils/crypto';
import './KeyDisplay.css';

const KeyDisplay = ({ privateKey, address, onClose }) => {
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopyPrivateKey = async () => {
    const ok = await copyToClipboard(privateKey);
    if (ok) { setCopiedPrivate(true); setTimeout(() => setCopiedPrivate(false), 2000); }
  };

  const handleCopyAddress = async () => {
    const ok = await copyToClipboard(address);
    if (ok) { setCopiedAddress(true); setTimeout(() => setCopiedAddress(false), 2000); }
  };

  const handleDownload = () => {
    const content = `CREDENCIAIS DE VOTAÇÃO
======================

Endereço Público:
${address}

Chave Privada:
${privateKey}

======================
IMPORTANTE:
- NUNCA compartilhe sua chave privada
- Guarde em local seguro
- Sem ela, você não poderá votar

Gerado em: ${new Date().toLocaleString('pt-BR')}
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credenciais-${address.substring(2, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card card--elevated animate-in">
      <div className="keydisplay-success">
        <div className="keydisplay-success__icon">✓</div>
        <div>
          <h2 className="keydisplay-success__title">Registro concluído!</h2>
          <p className="keydisplay-success__sub">Suas credenciais foram geradas e registradas na blockchain.</p>
        </div>
      </div>

      <div className="divider" />

      <div className="alert alert--warning">
        <strong>⚠ Atenção:</strong> Guarde sua chave privada agora.
        Ela não pode ser recuperada caso seja perdida.
      </div>

      {/* Endereço público */}
      <div className="form-group">
        <label className="form-label">Endereço Público</label>
        <div className="key-row">
          <code className="key-value font-mono break-all">{address}</code>
          <button
            className="btn btn--secondary"
            onClick={handleCopyAddress}
            type="button"
            style={{ flexShrink: 0 }}
          >
            {copiedAddress ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
        <p className="form-hint">Identificador público — pode ser compartilhado</p>
      </div>

      {/* Chave privada */}
      <div className="form-group">
        <label className="form-label">Chave Privada</label>
        <div className="key-row">
          <code className={`key-value font-mono break-all ${showPrivateKey ? '' : 'key-value--hidden'}`}>
            {showPrivateKey ? privateKey : '•'.repeat(66)}
          </code>
          <div className="key-actions">
            <button
              className="btn btn--secondary"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              type="button"
              style={{ flexShrink: 0 }}
            >
              {showPrivateKey ? 'Ocultar' : 'Mostrar'}
            </button>
            <button
              className="btn btn--secondary"
              onClick={handleCopyPrivateKey}
              type="button"
              style={{ flexShrink: 0 }}
            >
              {copiedPrivate ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
        <p className="form-hint" style={{ color: 'var(--color-error)' }}>
          NUNCA compartilhe sua chave privada com ninguém
        </p>
      </div>

      <div className="divider" />

      <button
        className="btn btn--primary btn--full"
        onClick={handleDownload}
        type="button"
        style={{ marginBottom: '0.75rem' }}
      >
        ↓ Baixar credenciais (.txt)
      </button>

      <div className="keydisplay-confirm">
        <label className="keydisplay-confirm__label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
          />
          Confirmo que salvei minhas credenciais em local seguro
        </label>
      </div>

      <button
        className="btn btn--secondary btn--full"
        onClick={onClose}
        disabled={!confirmed}
        type="button"
        style={{ marginTop: '0.75rem' }}
      >
        Concluir registro
      </button>
    </div>
  );
};

export default KeyDisplay;