# Rede PoA com Geth

Este projeto implementa uma rede blockchain Proof of Authority (PoA) utilizando o cliente Ethereum Geth com o algoritmo de consenso Clique.

## Arquivos Principais

### Configuração

- **genesis.json**: Define a configuração inicial da blockchain:
  - ChainID: 12345
  - Algoritmo de consenso: Clique (período: 15s, época: 30000 blocos)
  - 5 validadores configurados
  - Alocação inicial de fundos para contas

### Scripts de Gerenciamento

- **start-validators.sh**: Inicia a rede com 5 nós validadores.
  - Inicializa todos os validadores com o genesis.json
  - Configura conexão entre todos os validadores (full mesh)
  - Ativa mineração (selagem de blocos) em todos os nós

- **stop-validators.sh**: Encerra todos os validadores de forma segura.
  - Interrompe a mineração e serviços RPC
  - Termina processos geth graciosamente
  - Remove arquivos IPC órfãos

- **monitor-poa.sh**: Monitora o estado da rede e validadores.
  - Status de todos os validadores (online/offline)
  - Histórico de blocos e estatísticas de validadores
  - Informações da rede e taxa de produção de blocos
  - Monitoramento contínuo ou pontual

## Uso Básico

```bash
# Iniciar a rede
./start-validators.sh

# Monitorar a rede (interface interativa)
./monitor-poa.sh

# Monitoramento completo (execução única)
./monitor-poa.sh --full

# Monitoramento contínuo (atualização a cada 60s)
./monitor-poa.sh --continuous

# Encerrar a rede
./stop-validators.sh
```