import React, { useState } from 'react';
import { authorizationService } from '../../services/api';
import { generateKeyPair, cleanCPF, formatCPF } from '../../utils/crypto';
import LoadingSteps from './LoadingSteps';
import KeyDisplay from './KeyDisplay';
import './AuthorizationForm.css';

/**
 * Componente principal do formulario de autorizacao
 */
const AuthorizationForm = () => {
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(-1);
  const [keyPair, setKeyPair] = useState(null);
  const [showKeys, setShowKeys] = useState(false);

  // Etapas do processo
  const steps = [
    {
      title: 'Validando CPF',
      description: 'Verificando se o CPF esta autorizado...',
    },
    {
      title: 'Verificando Blockchain',
      description: 'Consultando se o CPF ja foi utilizado...',
    },
    {
      title: 'Gerando Chaves',
      description: 'Criando seu par de chaves criptograficas...',
    },
    {
      title: 'Registrando no Blockchain',
      description: 'Salvando seu registro na blockchain...',
    },
    {
      title: 'Concluido',
      description: 'Registro finalizado com sucesso!',
    },
  ];

  const handleCPFChange = (e) => {
    const value = e.target.value;
    // Permite apenas numeros e limita a 11 digitos
    const cleaned = cleanCPF(value).substring(0, 11);
    setCpf(cleaned);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validacao basica
    if (cpf.length !== 11) {
      setError('CPF deve conter 11 digitos');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentStep(0);

    try {
      // Etapa 1 e 2: Validar CPF (off-chain e on-chain)
      setCurrentStep(0);
      const validationResult = await authorizationService.validateCPF(cpf);
      
      if (!validationResult.success) {
        throw new Error(validationResult.error);
      }

      const cpfHash = validationResult.cpfHash;

      // Etapa 3: Gerar chaves no CLIENT-SIDE (seguranca!)
      setCurrentStep(2);
      await sleep(500); // Pequeno delay para UX
      
      const keys = generateKeyPair();
      setKeyPair(keys);

      // Etapa 4: Registrar no blockchain
      setCurrentStep(3);
      const registerResult = await authorizationService.registerVoter(
        keys.address,
        cpfHash
      );

      if (!registerResult.success) {
        throw new Error(registerResult.error);
      }

      // Etapa 5: Concluido
      setCurrentStep(4);
      await sleep(1000);
      
      // Exibir chaves para o usuario
      setShowKeys(true);

    } catch (err) {
      console.error('Erro no processo de autorizacao:', err);
      setError(err.message || 'Erro desconhecido. Tente novamente.');
      setCurrentStep(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCpf('');
    setError('');
    setCurrentStep(-1);
    setKeyPair(null);
    setShowKeys(false);
  };

  return (
    <div className="authorization-container">
      <div className="authorization-card">
        <div className="header">
          <h1>Sistema de Votacao Blockchain</h1>
          <p>Autorizacao de Eleitor</p>
        </div>

        {!loading && !showKeys && (
          <form onSubmit={handleSubmit} className="authorization-form">
            <div className="form-group">
              <label htmlFor="cpf">CPF:</label>
              <input
                type="text"
                id="cpf"
                value={formatCPF(cpf)}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                maxLength="14"
                disabled={loading}
                required
              />
              <small>Digite apenas os numeros do seu CPF</small>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || cpf.length !== 11}
            >
              {loading ? 'Processando...' : 'Gerar Credenciais de Votacao'}
            </button>

            <div className="info-box">
              <strong>Como funciona:</strong>
              <ul>
                <li>Digite seu CPF para verificacao</li>
                <li>O sistema validara se voce esta autorizado</li>
                <li>Suas chaves de votacao serao geradas de forma segura</li>
                <li>Guarde suas credenciais para votar</li>
              </ul>
            </div>
          </form>
        )}

        {loading && (
          <LoadingSteps 
            currentStep={currentStep} 
            steps={steps}
          />
        )}

        {showKeys && keyPair && (
          <KeyDisplay
            privateKey={keyPair.privateKey}
            address={keyPair.address}
            onClose={handleReset}
          />
        )}
      </div>

      <footer className="footer">
        <p>Sistema de Votacao Eletronica via Blockchain</p>
        <p>Desenvolvido com seguranca e transparencia</p>
      </footer>
    </div>
  );
};

// Funcao auxiliar para criar delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default AuthorizationForm;