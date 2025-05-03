# Sistema de Votação Baseado em Blockchain

Sistema de votação eletrônica descentralizado utilizando tecnologia blockchain, proporcionando transparência e segurança no processo eleitoral.

## Visão Geral

Este projeto implementa um sistema de votação em blockchain que permite:
- Criação de eleições com múltiplos candidatos
- Gerenciamento de eleitores com direitos de voto controlados
- Votação segura e transparente
- Contagem automática de votos
- Verificação do vencedor

## Estrutura do Projeto

- `/blockchain`: Contratos inteligentes e configuração da blockchain
  - `/contracts`: Contratos Solidity, incluindo o contrato principal `Ballot.sol`
  - `/scripts`: Scripts para deploy e interação com a blockchain
  - `/test`: Testes unitários e de integração dos contratos
  - `hardhat.config.js`: Configuração do ambiente de desenvolvimento
- `/frontend`: Interface de usuário em React (em desenvolvimento)
- `/docs`: Documentação técnica e do usuário
- `/scripts`: Scripts utilitários

## Contrato de Votação Implementado

O sistema é baseado no contrato inteligente `Ballot.sol`, que implementa:

- **Estrutura de Dados**:
  - `Voter`: Armazena informações do eleitor (direito a voto, status de votação, etc.)
  - `Proposal`: Representa um candidato/proposta com nome e contagem de votos

- **Principais Funcionalidades**:
  - Criação de eleição com lista de candidatos
  - Sistema de permissões controlado por um administrador (`chairPerson`)
  - Concessão de direito de voto a endereços específicos
  - Registro de votos com validação
  - Cálculo automático do vencedor
  - Emissão de eventos para auditoria (`VoteCast`)

- **Mecanismos de Segurança**:
  - Validação de permissões de voto
  - Prevenção contra votos duplicados
  - Validação de candidatos

## Tecnologias Utilizadas

- **Blockchain**: Ethereum, simulado com Ganache para desenvolvimento local
- **Framework de Desenvolvimento**: Hardhat para compilação, testes e deploy
- **Linguagem de Contratos**: Solidity 0.8.x
- **Testes**: Mocha e Chai para testes automatizados
- **Frontend** (planejado): React.js
- **Integração Blockchain**: Ethers.js para interação com a blockchain

## Testes Implementados

O sistema inclui testes abrangentes que cobrem:

1. **Testes de Implantação**:
   - Verificação de inicialização correta dos candidatos
   - Validação das configurações iniciais do contrato

2. **Testes de Segurança**:
   - Permissões do administrador (chairPerson)
   - Mecanismos de controle de acesso ao voto

3. **Testes Funcionais**:
   - Registro e validação de votos
   - Cálculo correto do vencedor
   - Emissão de eventos durante votação

4. **Testes de Falha**:
   - Tentativas de voto sem permissão
   - Tentativas de voto duplicado
   - Tentativas de voto em candidato inválido

## Estado Atual do Desenvolvimento

- ✅ Contrato inteligente `Ballot.sol` implementado e testado
- ✅ Configuração do ambiente Hardhat concluída
- ✅ Testes unitários e de integração funcionando
- ✅ Script de deploy básico implementado
- ✅ Integração com Ganache para desenvolvimento local
- 🔄 Estudos de escalabilidade com redes PoA (Proof of Authority) em andamento
- 🔄 Exploração de mecanismos de visualização da blockchain
- ⏳ Frontend em React (planejado)
- ⏳ Documentação detalhada do usuário (planejada)

## Próximos Passos

1. Desenvolver uma interface frontend para interação com a blockchain
2. Implementar mecanismos de autenticação de eleitores
3. Explorar a migração para uma rede Proof of Authority (PoA) com múltiplos validadores
4. Adicionar ferramentas de monitoramento e visualização da blockchain
5. Melhorar a documentação do usuário

## Como Executar (Desenvolvimento)

### Pré-requisitos

- Node.js (v14+)
- npm ou yarn
- Ganache (CLI ou GUI)

### Configuração

1. Clone o repositório:
   ```bash
   git clone https://github.com/Fauser77/voting-system
   cd sistema-votacao-blockchain
   ```

2. Instale as dependências:
   ```bash
   cd blockchain
   npm install
   ```

3. Inicie o Ganache (interface gráfica ou CLI):
   ```bash
   # Via CLI
   npx ganache-cli
   
   # Ou abra a aplicação Ganache GUI
   ```

4. Compile os contratos:
   ```bash
   npx hardhat compile
   ```

5. Execute os testes:
   ```bash
   npx hardhat test
   ```

6. Faça o deploy no Ganache:
   ```bash
   npx hardhat run scripts/deploy.js --network ganache
   ```