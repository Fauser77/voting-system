import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Menu.css';

const IconRegistro = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="menu-card__svg">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const IconVotar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="menu-card__svg">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/>
  </svg>
);
const IconResultados = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="menu-card__svg">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const menuItems = [
  {
    path: '/registro',
    icon: <IconRegistro />,
    label: 'Registrar-se',
    description: 'Valide seu CPF e gere suas credenciais de votação',
    badge: 'Cadastro',
    badgeClass: 'badge--blue',
    step: '01',
  },
  {
    path: '/votacao',
    icon: <IconVotar />,
    label: 'Votar',
    description: 'Acesse com suas credenciais e registre seu voto na blockchain',
    badge: 'Votação',
    badgeClass: 'badge--green',
    step: '02',
  },
  {
    path: '/resultados',
    icon: <IconResultados />,
    label: 'Resultados',
    description: 'Consulte os resultados finais da eleição',
    badge: 'Apuração',
    badgeClass: 'badge--yellow',
    step: '03',
  },
];

const Menu = () => {
  const navigate = useNavigate();

  return (
    <div className="menu-page">
      <div className="gov-stripe" />

      <header className="menu-header">
        <div className="menu-header__inner">
          <div className="menu-logo">VB</div>
          <div>
            <h1 className="menu-header__title">Votação Blockchain</h1>
            <span className="menu-header__subtitle">Sistema Eletrônico Seguro e Transparente</span>
          </div>
        </div>
      </header>

      <main className="menu-main">
        <div className="menu-hero">
          <p className="menu-hero__eyebrow">Bem-vindo ao sistema</p>
          <h2 className="menu-hero__title">
            Sua voz,<br />
            registrada com<br />
            <span className="menu-hero__highlight">segurança</span>
          </h2>
          <p className="menu-hero__desc">
            Votação eletrônica com criptografia ElGamal e imutabilidade blockchain.
            Selecione uma das opções abaixo para começar.
          </p>
        </div>

        <div className="menu-grid">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className="menu-card"
              onClick={() => navigate(item.path)}
              type="button"
            >
              <div className="menu-card__step">{item.step}</div>
              <div className="menu-card__icon">{item.icon}</div>
              <div className="menu-card__content">
                <div className="menu-card__top">
                  <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
                </div>
                <h3 className="menu-card__label">{item.label}</h3>
                <p className="menu-card__desc">{item.description}</p>
              </div>
              <div className="menu-card__arrow">›</div>
            </button>
          ))}
        </div>

        <div className="menu-security">
          <div className="menu-security__item">
            <svg className="menu-security__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span>Criptografia ElGamal</span>
          </div>
          <div className="menu-security__divider" />
          <div className="menu-security__item">
            <svg className="menu-security__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            <span>Blockchain Proof-of-Authority</span>
          </div>
          <div className="menu-security__divider" />
          <div className="menu-security__item">
            <svg className="menu-security__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <span>Voto auditável</span>
          </div>
        </div>
      </main>

      <footer className="gov-footer">
        <p>Sistema de Votação Eletrônica via Blockchain — Desenvolvido com segurança e transparência</p>
      </footer>
    </div>
  );
};

export default Menu;