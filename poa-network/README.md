# poa-network/

Infraestrutura da rede blockchain privada. Configura e opera 5 nós validadores Go Ethereum (Geth) sob o algoritmo de consenso **Clique (Proof of Authority)**.

---

## Por que Proof of Authority?

O PoA substitui o poder computacional (PoW) ou financeiro (PoS) pela **identidade institucional** como mecanismo de confiança. Para o contexto eleitoral, isso oferece:

| Característica | Benefício eleitoral |
|---|---|
| Blocos determinísticos a cada 5s | Confirmações previsíveis durante votação |
| Sem gas fees monetários | Custo operacional fixo, sem variação por demanda |
| Validadores identificáveis | Responsabilização jurídica por tentativas de fraude |
| Alta throughput (~20 TPS) | Capacidade para pleitos de médio porte |
| Sem mineração competitiva | Sem desperdício energético |

**Vulnerabilidade assumida:** o modelo falha se dois terços dos validadores agirem em conluio. A mitigação é a escolha de instituições com interesses conflitantes (ex: TSE, OAB, universidade federal, Ministério Público, imprensa independente).

---

## Estrutura

```
poa-network/
├── genesis.json                ← bloco gênese da rede
├── initialize-validators.sh    ← inicializa a blockchain do zero (bloco 0)
├── start-validators.sh         ← inicia os 5 nós validadores
├── stop-validators.sh          ← encerra os nós graciosamente
├── monitor-poa.sh              ← monitoramento interativo da rede
│
├── validator1/                 ← dados do nó 1 (criado automaticamente)
│   ├── keystore/               ← chave da conta validadora (criptografada)
│   ├── password.txt            ← senha para desbloquear o keystore
│   └── geth/                   ← dados da blockchain (chaindata, etc.)
│
├── validator2/ ... validator5/ ← mesma estrutura para cada nó
```

---

## Configuração da Rede (`genesis.json`)

```json
{
  "config": {
    "chainId": 12345,
    "clique": {
      "period": 5,
      "epoch": 30000
    }
  },
  "difficulty": "1",
  "gasLimit": "20000000",
  "extradata": "0x0000...{endereços dos 5 validadores}...0000"
}
```

### Parâmetros explicados

| Campo | Valor | Significado |
|---|---|---|
| `chainId` | 12345 | Identificador único da rede — evita replay attacks de outras redes |
| `period` | 5 | Intervalo entre blocos em segundos |
| `epoch` | 30000 | Frequência de snapshots do estado dos signatários |
| `gasLimit` | 20.000.000 | ~75 votos por bloco (265.000 gas/voto) |
| `difficulty` | 1 | No PoA Clique, dificuldade é simbólica |

### `extradata` — como codificar os validadores

O campo `extradata` codifica os endereços autorizados a selar blocos:

```
0x
[32 bytes zeros]           ← prefixo vazio
[endereço validador 1]     ← 20 bytes sem 0x
[endereço validador 2]
[endereço validador 3]
[endereço validador 4]
[endereço validador 5]
[65 bytes zeros]           ← assinatura vazia (bloco gênese não é assinado)
```

### `alloc` — saldos iniciais

Os validadores e contas administrativas recebem saldo inicial em Ether. Embora o Ether não tenha valor monetário em uma rede privada, ele é necessário como unidade de medida de **gas** — a EVM exige gas mesmo em redes PoA.

---

## Algoritmo Clique — Funcionamento

O Clique implementa um rodízio justo entre os validadores autorizados:

1. **Seleção do propositor:** para o bloco `N`, o propositor é `signers[N % len(signers)]`
2. **Timeout:** se o propositor principal não selar no período configurado, qualquer outro validador pode selá-lo com dificuldade reduzida
3. **Validação:** cada bloco carrega a assinatura ECDSA do validador no cabeçalho — verificada pelos demais nós
4. **Limite de in-turn:** para evitar monopolização, um validador não pode selar mais de `floor(len(signers)/2)` blocos consecutivos

**Governança dinâmica:** a lista de validadores pode ser alterada por votação majoritária via `clique.propose(address, auth)` — sem necessidade de hard fork.

---

## Scripts

### `initialize-validators.sh`

Inicializa a blockchain **do zero**. Use ao criar a rede pela primeira vez ou ao resetar completamente:

```bash
./initialize-validators.sh
```

O script:
1. Verifica se há processos Geth em execução (e os encerra com confirmação)
2. Remove os diretórios `geth/` de cada validador (preserva `keystore/` e `password.txt`)
3. Executa `geth --datadir validatorN init genesis.json` para cada nó
4. Verifica se o `chaindata` foi criado corretamente

---

### `start-validators.sh`

Inicia os 5 nós em background:

```bash
./start-validators.sh
```

Para cada validador, executa algo equivalente a:

```bash
geth \
  --datadir validatorN \
  --networkid 12345 \
  --port 3030N \
  --http --http.port 854N \
  --http.api eth,net,web3,clique,admin,miner \
  --unlock <endereço> \
  --password validatorN/password.txt \
  --mine \
  --miner.etherbase <endereço> \
  --bootnodes <enode://...>
```

O nó 1 atua como bootnode de referência. Os demais se conectam via `--bootnodes`.

---

### `stop-validators.sh`

Encerra os nós graciosamente:

```bash
./stop-validators.sh
```

Sequência: para a mineração → para RPC → envia SIGTERM → aguarda 5s → SIGKILL se necessário → remove arquivos IPC órfãos.

---

### `monitor-poa.sh`

Monitor interativo com menu:

```bash
./monitor-poa.sh

# ou em modo não-interativo:
./monitor-poa.sh --full        # relatório completo único
./monitor-poa.sh --continuous  # atualização a cada 60s
```

**Opções do menu:**
1. Status de todos os validadores (peers, bloco atual, saldo, mineração ativa)
2. Histórico de blocos com o validador que selou cada um
3. Estatísticas de blocos produzidos por validador
4. Informações gerais da rede (lista de signatários, último bloco)
5. Cálculo de taxa de produção (monitora por 60s)
6. Monitoramento completo
7. Monitoramento contínuo

Internamente usa `geth attach validatorN/geth.ipc` para executar comandos JavaScript no console do Geth.

---

## Topologia da Rede

```
        ┌─────────────────────────────────────────────┐
        │           CONSENSO CLIQUE (PoA)             │
        │           Bloco a cada 5 segundos           │
        └──────────────────┬──────────────────────────┘
                           │
        ┌──────────────────┼──────────────────────┐
        │         ┌────────┴────────┐              │
   [NODE 1]       │    [NODE 3]     │         [NODE 2]
   Validador 1    │   Validador 3   │         Validador 2
   Tribunal       │  Universidade   │         Órgão
   Eleitoral      │                 │         Fiscalizador
        │         └────────┬────────┘              │
        │                  │                        │
   [NODE 5]           [NODE 4]                      │
   Validador 5       Validador 4    ←───────────────┘
   Ministério        Imprensa/ONG
   Público
```

Topologia de malha completa (full mesh) via protocolo DevP2P. A falha de qualquer nó individual não compromete o consenso — basta `floor(N/2) + 1` nós honestos (3 de 5).

---

## Setup Inicial (passo a passo)

### 1. Criar as contas dos validadores

```bash
# Para cada validador (1 a 5):
geth --datadir validator1 account new
# Informar senha → anotar o endereço gerado
```

### 2. Atualizar `genesis.json`

Substituir os endereços no campo `alloc` e reconstruir o `extradata` com os 5 endereços gerados.

**Ferramenta para gerar `extradata`:**
```bash
# puppeth (incluído no Geth) ou manualmente:
python3 -c "
addrs = ['endereço1', 'endereço2', ...] # sem 0x
extra = '0x' + '0'*64
for a in addrs:
    extra += a.lower()
extra += '0'*130
print(extra)
"
```

### 3. Atualizar `accounts.config.js`

```javascript
// blockchain/accounts.config.js
const POA_PRIVATE_KEYS = [
    '0x...', // admin/deployer
    '0x...', // relayer
    // ... outras contas operacionais
];
```

### 4. Inicializar e iniciar

```bash
./initialize-validators.sh
./start-validators.sh
```

### 5. Verificar

```bash
# Aguardar alguns segundos e verificar produção de blocos
geth attach validator1/geth.ipc --exec "eth.blockNumber"
# Deve retornar > 0
```

---

## Configuração RPC

| Porta | Nó | Uso |
|---|---|---|
| 8545 | validator1 | **Porta principal** — usada pela API e scripts Hardhat |
| 8546 | validator2 | Backup |
| 8547-8549 | validator3-5 | Monitoramento |

A API e o Hardhat apontam exclusivamente para `http://127.0.0.1:8545` (validator1). Em produção, um load balancer deveria distribuir entre os nós disponíveis.

---

## Notas de Segurança

- Os arquivos `keystore/` e `password.txt` contêm as chaves das contas validadoras. **Não commitar.**
- O flag `--http.api` expõe `admin` e `clique` na interface RPC local. Em produção, deve-se restringir o acesso por IP e nunca expor esses endpoints publicamente.
- A flag `--unlock` mantém a conta desbloqueada permanentemente no processo Geth. Em produção, considerar soluções de assinatura externa (Clef).