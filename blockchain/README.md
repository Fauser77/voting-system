# Sistema de Votação Blockchain

Sistema de votação implementado com Solidity para redes Ethereum, incluindo suporte para redes PoA (Proof of Authority).

## Estrutura de Arquivos

- **blockchain-manager.js**: Ferramenta completa que integra todas as funcionalidades
- **deploy.js**: Script para implantação do contrato de votação
- **interact.js**: Funções para interagir com o contrato existente
- **utils.js**: Utilitários compartilhados entre os scripts
- **vote-cli.js**: Interface de linha de comando para o sistema de votação

## Funcionalidades

- Deploy de contratos de votação em redes locais ou PoA
- Gestão de direitos de voto
- Registro e contabilização de votos
- Monitoramento de eventos em tempo real
- Análise de blocos e transações
- Interface interativa para todas as operações

## Como Usar

### Recomendação Principal

```bash
# Gerenciador completo com todas as funcionalidades
npx hardhat run scripts/blockchain-manager.js --network [network-name]
```

O gerenciador blockchain oferece uma interface unificada para todas as operações e é a forma recomendada de interagir com o sistema.

### Verificar Contas e Configurações

```bash
npx hardhat run scripts/blockchain-manager.js --network [network-name]
# Selecione opção 1 no menu
```

### Implantar Novo Contrato

```bash
# Método Simples
npx hardhat run scripts/deploy.js --network [network-name]

# Método Interativo
npx hardhat run scripts/blockchain-manager.js --network [network-name]
# Selecione opção 2 no menu
```

### Interagir com Contrato Existente

```bash
# Método Simples
npx hardhat run scripts/interact.js --network [network-name]

# Método Interativo
npx hardhat run scripts/blockchain-manager.js --network [network-name]
# Selecione opção 3 no menu
```

### CLI de Votação Alternativa

```bash
npx hardhat run scripts/vote-cli.js --network [network-name]
```

### Monitoramento e Análise

```bash
npx hardhat run scripts/blockchain-manager.js --network [network-name]
# Selecione opção 4 no menu
```

## Configuração

### Tornar Scripts Executáveis (Linux/macOS)

```bash
chmod +x scripts/blockchain-manager.js
chmod +x scripts/vote-cli.js
```

### Requisitos

- Node.js >= 14.0.0
- Hardhat
- Conta com ETH (para redes de teste) ou tokens PoA (para rede PoA)

## Redes Suportadas

- Redes locais (Hardhat, Ganache)
- Redes PoA personalizadas
- Redes de teste públicas (Sepolia, Goerli)

## Observações

- O contrato implementa um sistema de votação com direitos controlados pelo chairperson
- Cada eleitor só pode votar uma vez
- O sistema registra eventos para auditoria das votações
- Os resultados são contabilizados e o vencedor é determinado automaticamente
- O arquivo `contract-address.txt` é criado automaticamente no deploy e utilizado pelos outros scripts