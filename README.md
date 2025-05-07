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

```
blockchain/
├── contracts/               # Smart contracts Solidity
│   ├── Ballot.sol           # Contrato principal de votação
│   └── Lock.sol             # Contrato de exemplo do Hardhat
├── scripts/                 # Scripts de deploy
├── test/                    # Testes automatizados
├── hardhat.config.js        # Configuração do Hardhat
└── poa-network/             # Arquivos da rede PoA
    ├── genesis.json         # Configuração inicial da blockchain
    ├── validator1/          # Dados do primeiro validador
    ├── validator2/          # Dados do segundo validador
    ├── validator3/          # Dados do terceiro validador
    ├── validator4/          # Dados do quarto validador
    ├── validator5/          # Dados do quinto validador
    ├── start-validators.sh  # Inicia os validadores da rede
    ├── stop-validators.sh   # Para os validadores de forma limpa
    ├── monitor-poa.sh       # Monitora o estado da rede PoA
    └── check-validators.sh  # Verifica quais validadores produziram quais blocos
```

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

- **Blockchain**: Ethereum, simulado com Ganache para desenvolvimento local para testes iniciais, e posteriormente Go-Ethereum (Geth) em rede PoA 
- **Framework de Desenvolvimento**: Hardhat para compilação, testes e deploy
- **Linguagem de Contratos**: Solidity 0.8.x
- **Testes**: Mocha e Chai para testes automatizados
- **Frontend** (planejado): React.js
- **Integração Blockchain**: Ethers.js para interação com a blockchain

## Rede PoA (Proof of Authority)
O sistema utiliza uma rede Ethereum PoA para garantir eficiência e controle no processo de votação:

   - Arquitetura: 5 nós validadores em uma rede privada
   - Consenso: Clique PoA (blocos a cada 15 segundos)
   - Validação: Apenas nós autorizados podem validar transações
   - Gerenciamento: Sistema de rotação de validadores

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

## Como Executar (Desenvolvimento)

## Comandos Hardhat Básicos

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```

## Comandos Hardhat Básicos e teste simples via Ganache

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

## Rede PoA (Proof of Authority)

Este projeto implementa uma rede blockchain privada baseada no consenso Proof of Authority (PoA), onde um conjunto de validadores pré-definidos são responsáveis pela produção de blocos.

### Configuração da Rede PoA

1. Certifique-se que o Geth está instalado no sistema:
```shell
geth version
```

2. Navegue até a pasta poa-network:
```shell
cd poa-network
```

3. Inicie a rede PoA com os validadores:
```shell
./start-validators.sh
```

Este script iniciará 5 validadores que formarão a rede PoA. Cada validador executa uma instância do Geth configurada para participar do consenso PoA.

### Monitoramento da Rede

Para verificar o estado atual da rede PoA:

```shell
./monitor-poa.sh
```

Este comando mostrará:
- Status de cada validador
- Número de peers conectados
- Bloco atual
- Status de mineração
- Taxa de produção de blocos

### Verificação de Validadores

Para verificar quais validadores produziram quais blocos:

```shell
./check-validators.sh
```

Isso mostrará um histórico dos blocos recentes e quais validadores foram responsáveis por produzi-los.

### Parando a Rede PoA

Para encerrar a rede de forma limpa:

```shell
./stop-validators.sh
```

## Observações sobre o Consenso PoA

No consenso PoA implementado (algoritmo Clique do Geth):

1. Os validadores se revezam para produzir blocos em uma ordem determinística
2. O campo `miner` dos blocos pode mostrar o endereço zero (`0x0000000000000000000000000000000000000000`)
3. Para identificar qual validador produziu um bloco específico, use o comando `clique.getSnapshot().recents`
4. O parâmetro `period` no genesis.json determina o intervalo mínimo entre blocos (atualmente configurado para 30 segundos)

## Contrato de Votação

O contrato `Ballot.sol` implementa um sistema de votação com as seguintes funcionalidades:

- Cadastro de candidatos no momento do deploy
- Administração de direitos de voto
- Votação segura (apenas eleitores autorizados)
- Contagem de votos e determinação do vencedor