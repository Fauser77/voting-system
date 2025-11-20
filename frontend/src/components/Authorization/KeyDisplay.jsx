import React, { useState } from 'react';
import { copyToClipboard } from '../../utils/crypto';
import './KeyDisplay.css';

/**
 * Componente para exibir as chaves geradas ao eleitor
 */
const KeyDisplay = ({ privateKey, address, onClose }) => {
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const handleCopyPrivateKey = async () => {
    const success = await copyToClipboard(privateKey);
    if (success) {
      setCopiedPrivate(true);
      setTimeout(() => setCopiedPrivate(false), 2000);
    }
  };

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleDownload = () => {
    const content = `SUAS CREDENCIAIS DE VOTACAO
========================

MANTENHA ESTAS INFORMACOES EM SEGURANCA!

Endereco Publico:
${address}

Chave Privada:
${privateKey}

========================
IMPORTANTE:
- Voce precisara destas credenciais para votar
- NUNCA compartilhe sua chave privada com ninguem
- Guarde em local seguro (arquivo criptografado, gerenciador de senhas, etc.)
- Sem a chave privada, voce NAO podera votar
========================

Data de geracao: ${new Date().toLocaleString('pt-BR')}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credenciais-votacao-${address.substring(2, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="key-display-overlay">
      <div className="key-display-modal">
        <div className="success-icon">🎉</div>
        
        <h2>Registro Concluido com Sucesso!</h2>
        
        <div className="warning-box">
          <strong>ATENCAO: Guarde estas informacoes com seguranca!</strong>
          <p>Voce precisara delas para votar. Sem sua chave privada, voce NAO podera votar.</p>
        </div>

        {/* Endereco Publico */}
        <div className="key-section">
          <label>Seu Endereco Publico:</label>
          <div className="key-display">
            <code>{address}</code>
            <button 
              onClick={handleCopyAddress}
              className="copy-button"
              title="Copiar endereco"
            >
              {copiedAddress ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <small>Este e seu identificador publico. Pode ser compartilhado.</small>
        </div>

        {/* Chave Privada */}
        <div className="key-section">
          <label>Sua Chave Privada:</label>
          <div className="key-display">
            <code className={showPrivateKey ? '' : 'blurred'}>
              {showPrivateKey ? privateKey : '••••••••••••••••••••••••••••••••'}
            </code>
            <button 
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="toggle-button"
              title={showPrivateKey ? 'Ocultar chave' : 'Mostrar chave'}
            >
              {showPrivateKey ? 'Ocultar' : 'Mostrar'}
            </button>
            <button 
              onClick={handleCopyPrivateKey}
              className="copy-button"
              title="Copiar chave privada"
            >
              {copiedPrivate ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <small className="warning-text">
            NUNCA compartilhe sua chave privada com ninguem!
          </small>
        </div>

        {/* Instrucoes */}
        <div className="instructions-box">
          <h3>Como proceder:</h3>
          <ol>
            <li>Clique em "Baixar Credenciais" para salvar um arquivo texto</li>
            <li>Guarde o arquivo em local seguro (use criptografia se possivel)</li>
            <li>Ou copie as credenciais para um gerenciador de senhas</li>
            <li>Quando for votar, voce precisara da sua chave privada</li>
          </ol>
        </div>

        {/* Botoes de acao */}
        <div className="action-buttons">
          <button onClick={handleDownload} className="download-button">
            Baixar Credenciais
          </button>
          <button onClick={onClose} className="close-button">
            Entendi, ja guardei minhas credenciais
          </button>
        </div>

        {/* Aviso final */}
        <div className="final-warning">
          <p>
            <strong>Lembre-se:</strong> Sem sua chave privada, voce nao podera votar. 
            Nao ha como recupera-la caso perca.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyDisplay;