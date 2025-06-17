# Sistema de Votação Blockchain

Um sistema de votação eletrônica seguro e transparente baseado em tecnologia blockchain, desenvolvido com contratos inteligentes Ethereum e rede Proof of Authority (PoA).

## Visão Geral

Este projeto implementa uma solução completa de votação digital que utiliza blockchain para garantir **imutabilidade**, **integridade** e **transparência** no processo eleitoral. O sistema elimina a necessidade de confiança em autoridades centrais, permitindo que qualquer participante possa verificar independentemente a validade dos resultados.

## Arquitetura do Sistema

O projeto está estruturado em três componentes principais:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │ ←→ │  Blockchain     │ ←→ │  PoA Network    │
│  Interface Web  │    │ Smart Contracts │    │   Infraestrutura│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Blockchain - Núcleo de Votação
- **Smart Contract em Solidity** para lógica de votação
- **Imutabilidade garantida** - votos registrados permanentemente
- **Validações automáticas** - prevenção de fraudes e votos duplicados
- **Transparência total** - todos os registros são auditáveis
- **Controle de acesso** - apenas eleitores autorizados podem votar

### PoA Network - Infraestrutura Confiável
- **Rede privada Proof of Authority** com 5 validadores
- **Consenso controlado** - validadores conhecidos e confiáveis
- **Performance otimizada** - blocos a cada 15 segundos
- **Ambiente controlado** - ideal para votações institucionais
- **Custos previsíveis** - sem flutuações de gas fees

### Frontend - Interface do Usuário
- **Interface web intuitiva** desenvolvida em React
- **Dashboards diferenciados** para eleitores e administradores
- **Integração direta** com blockchain via Ethers.js
- **Verificação de votos** em tempo real
- **Monitoramento** da rede e transações

## Garantias de Segurança

### **Imutabilidade**
- Votos registrados na blockchain **não podem ser alterados ou removidos**
- Histórico completo preservado permanentemente
- Impossibilidade de manipulação retroativa de resultados

### **Integridade** 
- **Validação automática** de cada voto através de smart contracts
- Prevenção de votos duplicados por eleitor
- Verificação de permissões antes de cada votação
- Contabilização automática e transparente

### **Transparência**
- **Código aberto** - contratos e lógica totalmente auditáveis
- Todos os votos são **publicamente verificáveis**
- Rastreabilidade completa através de eventos blockchain
- Resultados calculados automaticamente sem intervenção humana

### **Auditabilidade**
- Cada voto gera um **registro permanente** na blockchain
- Eleitores podem **verificar independentemente** seu próprio voto
- Observadores podem auditar todo o processo em tempo real
- Hash criptográfico garante integridade dos dados

## Funcionalidades Principais

### Para Eleitores
- **Login seguro** com chave privada
- **Votação intuitiva** com interface amigável
- **Verificação de voto** com prova blockchain
- **Acompanhamento** de resultados em tempo real

### Para Administradores
- **Gestão de permissões** de voto
- **Controle da eleição** (pausar/retomar)
- **Monitoramento** da rede blockchain
- **Deploy de novas eleições**
- **Análise de estatísticas** em tempo real

### Para Auditores
- **Inspeção completa** da blockchain
- **Verificação independente** de todos os votos
- **Análise de blocos** e transações
- **Validação** da integridade do processo

## Estrutura do Repositório

```
📦 sistema-votacao-blockchain/
├── 📂 blockchain/           # Smart contracts e scripts de interação
│   ├── contracts/          # Contratos Solidity
│   ├── scripts/            # Deploy, interação e monitoramento
│   └── test/              # Testes automatizados
├── 📂 poa-network/         # Infraestrutura da rede PoA
│   ├── genesis.json       # Configuração inicial da rede
│   └── scripts/           # Gerenciamento de validadores
└── 📂 frontend/            # Interface web React
    ├── src/pages/         # Páginas da aplicação
    ├── src/components/    # Componentes reutilizáveis
    └── src/services/      # Serviços de integração
```

## Stack Tecnológico

### Blockchain
- **Solidity** - Linguagem dos smart contracts
- **Hardhat** - Framework de desenvolvimento
- **Ethers.js** - Biblioteca de integração Web3

### Infraestrutura
- **Geth** - Cliente Ethereum
- **Clique PoA** - Algoritmo de consenso

### Frontend
- **React 18** - Framework de interface
- **Material-UI** - Biblioteca de componentes
- **Context API** - Gerenciamento de estado
- **MUI Charts** - Visualização de dados

## Casos de Uso

- **Eleições corporativas** - Votações em empresas e organizações
- **Processos acadêmicos** - Eleições estudantis e universitárias
- **Decisões comunitárias** - Votações em associações e cooperativas
- **Consultas públicas** - Decisões participativas em governos locais
- **Proof of Concept** - Demonstração de votação blockchain

## Vantagens da Solução

### **Versus Votação Tradicional**
- **Impossibilidade de fraude** - validação automática
- **Contagem instantânea** - resultados em tempo real
- **Auditoria permanente** - registros imutáveis
- **Transparência total** - processo público e verificável

### **Versus Sistemas Centralizados**
- **Descentralização** - sem ponto único de falha
- **Independência** - sem necessidade de confiança em terceiros
- **Verificabilidade** - qualquer um pode auditar
- **Resistência a censura** - impossível bloquear votos válidos

## Aspectos Técnicos Avançados

### **Consensus Mechanism**
A rede PoA utiliza o algoritmo **Clique** com 5 validadores pré-autorizados, garantindo finalidade determinística e blocos regulares a cada 15 segundos.

### **Event-Driven Architecture**
O sistema utiliza eventos blockchain (`VoteCast`) para rastreabilidade completa, permitindo reconstrução do histórico de votação e auditoria independente.

### **Cryptographic Proof**
Cada voto é protegido por hash criptográfico SHA-256, garantindo que qualquer tentativa de alteração seja imediatamente detectável.

## Documentação Adicional

- [`blockchain/README.md`](./blockchain/README.md) - Detalhes dos smart contracts e scripts
- [`poa-network/README.md`](./poa-network/README.md) - Configuração e gerenciamento da rede
- [`frontend/README.md`](./frontend/README.md) - Interface web e funcionalidades

## Contribuição

Este projeto demonstra a aplicação prática de blockchain em processos democráticos, combinando **segurança**, **transparência** e **usabilidade** em uma solução completa de votação digital.

---

**⚡ Blockchain + PoA + React = Votação Digital Segura e Transparente**