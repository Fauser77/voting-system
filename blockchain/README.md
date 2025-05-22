# Sistema de Votação Blockchain

Sistema de votação implementado com Solidity para redes Ethereum, incluindo suporte para redes PoA (Proof of Authority).

## Estrutura de Arquivos

- **deploy.js**: Deploy do contrato de votação
- **interact.js**: Interface CLI e funções para interagir com o contrato
- **utils.js**: Funções utilitárias compartilhadas
- **monitor-blocks.js**: Análise de blocos e transações (opcional)

## Funcionalidades

- Deploy de contratos de votação
- Gestão de direitos de voto
- Registro e contabilização de votos
- Interface CLI interativa
- Análise de blocos (debug)

## Como Usar

### Deploy do Contrato

```bash
npx hardhat run scripts/deploy.js --network [network-name]
```

### Interagir com o Contrato

```bash
npx hardhat run scripts/interact.js --network [network-name]
```

Menu interativo com opções:
- Ver informações do contrato
- Conceder direitos de voto
- Registrar votos
- Visualizar resultados

### Análise de Blocos (Opcional)

```bash
npx hardhat run scripts/monitor-blocks.js --network [network-name]
```

## Configuração

### Requisitos

- Node.js >= 14.0.0
- Hardhat
- Conta com ETH (para redes de teste) ou tokens PoA (para rede PoA)

## Redes Suportadas

- Redes locais (Hardhat)
- Redes PoA personalizadas

## Observações

- O contrato implementa um sistema de votação com direitos controlados pelo chairperson
- Cada eleitor só pode votar uma vez
- O sistema registra eventos para auditoria das votações
- Os resultados são contabilizados e o vencedor é determinado automaticamente
- O arquivo `contract-address.txt` é criado automaticamente no deploy