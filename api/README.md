# api/

Servidor Express que atua como **relayer anônimo** entre o frontend e a blockchain. Recebe votos já assinados pelo eleitor, valida-os off-chain e os submete à rede usando uma conta administrativa dedicada — quebrando o vínculo direto entre a identidade do votante e o registro público na blockchain.

---

## Por que um Relayer?

Em um fluxo direto, o eleitor enviaria a transação com sua própria carteira, e o campo `from` na blockchain revelaria seu endereço. O padrão relayer resolve isso:

```
Eleitor → [cifra + assina voto] → API (Relayer) → Blockchain
                                       ↑
                             "from" na blockchain é este endereço
                             A autenticidade do eleitor é garantida
                             pela assinatura dentro da transação
```

O contrato verifica a assinatura via `ecrecover` e confirma que o conteúdo foi assinado pelo endereço autorizado — mesmo que não tenha sido ele a submeter a transação.

---

## Estrutura

```
api/
├── src/
│   ├── routes/
│   │   ├── authorization.js   ← /api/authorization/*
│   │   └── voting.js          ← /api/voting/*
│   ├── services/
│   │   └── blockchainService.js ← conexão ethers.js, wrapper do contrato
│   └── server.js              ← bootstrap Express, middlewares, roteamento
├── .env                       ← variáveis de ambiente (não versionar)
├── .env.example
└── package.json
```

---

## Endpoints

### Autorização — `/api/authorization`

#### `POST /validate-cpf`

Valida o CPF antes de gerar as credenciais. Executa verificação em duas etapas.

**Body:**
```json
{ "cpf": "12345678909" }
```

**Fluxo interno:**
1. Valida formato (11 dígitos numéricos)
2. Verifica se CPF consta em `election-cpfs.json` — **validação off-chain**
3. Gera `keccak256(cpf)` e consulta `checkCPFStatus(hash)` no contrato — **validação on-chain**
4. Verifica se a fase atual é `Registration`

**Resposta (sucesso):**
```json
{
  "success": true,
  "message": "CPF validado com sucesso",
  "cpfHash": "0x..."
}
```

---

#### `POST /register`

Registra o endereço público do eleitor no contrato após geração das chaves no frontend.

**Body:**
```json
{
  "voterAddress": "0x...",
  "cpfHash": "0x..."
}
```

**Fluxo interno:**
1. Valida formatos (endereço Ethereum 40 hex + hash 64 hex)
2. Re-verifica disponibilidade do CPF on-chain (dupla checagem)
3. Chama `registerVoterWithCPF(voterAddress, cpfHash)` com a conta admin
4. Aguarda confirmação do bloco
5. Atualiza `election-config.json` localmente com o novo endereço

**Resposta (sucesso):**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 42
}
```

---

#### `GET /stats`

Retorna estatísticas gerais da eleição.

**Resposta:**
```json
{
  "success": true,
  "stats": {
    "totalAuthorizedCPFs": 10,
    "totalRegisteredVoters": 4,
    "pendingRegistrations": 6,
    "currentPhase": "Registration"
  }
}
```

---

#### `GET /health`

Health check da conexão com a blockchain.

**Resposta:**
```json
{
  "success": true,
  "status": "operational",
  "blockchain": {
    "connected": true,
    "chainId": "12345",
    "blockNumber": 127,
    "contractAddress": "0x..."
  }
}
```

---

### Votação — `/api/voting`

#### `POST /authenticate`

Autentica o eleitor pela fase atual e seu endereço público. Retorna candidatos e parâmetros ElGamal para cifragem no frontend.

**Body:**
```json
{ "voterAddress": "0x..." }
```

**Fluxo interno:**
1. Verifica fase `Voting`
2. Consulta `hasRightToVote(address)` no contrato
3. Consulta `hasVoted(address)` no contrato
4. Retorna candidatos (do `public-config.json`) e parâmetros ElGamal públicos (`p`, `g`, `h`)

**Resposta:**
```json
{
  "success": true,
  "candidates": [
    { "index": 0, "name": "Maria Silva" },
    { "index": 1, "name": "João Santos" },
    { "index": 2, "name": "Ana Costa" }
  ],
  "elgamalParams": {
    "p": "55165897703670560...",
    "g": "46660909002153792...",
    "h": "17554745303297698..."
  }
}
```

---

#### `POST /submit`

Recebe o voto cifrado e assinado e o submete à blockchain via relayer.

**Body:**
```json
{
  "voterAddress": "0x...",
  "c1_values": ["123...", "456...", "789..."],
  "c2_values": ["321...", "654...", "987..."],
  "signature": "0x..."
}
```

**Fluxo interno:**
1. Valida formatos e tamanhos dos arrays
2. Cria wallet do relayer com `RELAYER_PRIVATE_KEY`
3. Chama `submitEncryptedVote(c1, c2, signature, voterAddress)` com a conta relayer
4. O contrato verifica: relayer autorizado → hash dos dados → assinatura ECDSA → eleitor autorizado → não votou ainda
5. Aguarda confirmação

**Resposta:**
```json
{
  "success": true,
  "message": "Voto registrado com sucesso",
  "transactionHash": "0x...",
  "blockNumber": 84
}
```

---

#### `GET /verify/:address`

Verifica o status de um endereço: se está registrado e se já votou.

**Resposta:**
```json
{
  "success": true,
  "registered": true,
  "hasVoted": false
}
```

---

#### `GET /search/:txHash`

Busca os dados de um voto pelo hash da transação. Permite que o eleitor verifique se seu voto foi registrado corretamente.

**Fluxo interno:**
1. Busca a transação na blockchain
2. Verifica se o `to` é o endereço do contrato correto
3. Consulta os eventos `VoteSubmitted` do bloco
4. Retorna os valores cifrados correspondentes

**Resposta:**
```json
{
  "success": true,
  "vote": {
    "txHash": "0x...",
    "blockNumber": 84,
    "blockHash": "0x...",
    "voteIndex": 3,
    "timestamp": "2026-02-22T21:15:00.000Z",
    "relayer": "0x...",
    "encryptedValues": [
      { "candidate": "Maria Silva", "c1": "123...", "c2": "321..." }
    ],
    "confirmations": 12
  }
}
```

---

#### `GET /results`

Retorna os resultados finais. Disponível apenas na fase `Ended` ou quando resultados já foram publicados no contrato.

---

## Serviço Blockchain (`blockchainService.js`)

Singleton que encapsula toda a lógica de conexão com a rede. Inicializado uma vez na subida do servidor.

**Responsabilidades:**
- Carregar `public-config.json` e estabelecer conexão com o nó via `JsonRpcProvider`
- Criar a instância do contrato com o ABI mínimo necessário
- Expor métodos tipados: `registerVoter`, `submitVote`, `searchVote`, `getElectionResults`, etc.
- Manter separação entre conta admin (registro) e conta relayer (votação)

**Método `hashCPF`:**
```javascript
hashCPF(cpf) {
    return ethers.keccak256(ethers.toUtf8Bytes(cpf));
}
```
O CPF é convertido para bytes UTF-8 antes do hash — deve ser idêntico ao método usado no contrato para comparação on-chain.

---

## Middlewares e Segurança

```javascript
app.use(helmet());          // headers de segurança HTTP
app.use(cors({ ... }));     // origins permitidas via ALLOWED_ORIGINS
app.use(rateLimit({ ... })); // 100 requisições por 15 minutos por IP
```

---

## Variáveis de Ambiente

```env
# Conexão com a blockchain
PROVIDER_URL=http://127.0.0.1:8545
BLOCKCHAIN_PATH=../blockchain

# Contas
ADMIN_PRIVATE_KEY=0x...      # conta que registra eleitores e gerencia o contrato
RELAYER_PRIVATE_KEY=0x...    # conta que submete transações de voto

# Servidor
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Separação de contas:**  
`ADMIN_PRIVATE_KEY` e `RELAYER_PRIVATE_KEY` devem ser contas diferentes. O relayer é registrado no construtor do contrato como `authorizedRelayers[address] = true`. O admin é o deployer e tem permissão nas funções `onlyAdmin`.

---

## Instalação e Execução

```bash
cd api
npm install
cp .env.example .env
# editar .env com as chaves corretas

npm start
# ou em modo desenvolvimento:
npm run dev
```

A API sobe na porta `3001` por padrão. Na inicialização, conecta-se ao contrato e exibe a fase atual:

```
=== Iniciando API de Votação Blockchain ===

📡 Conectando ao blockchain...
✅ Conectado ao contrato: 0x22f9Bdb93E73...
✅ Admin wallet: 0x1068cb909...
✅ Fase atual: Registration

✅ API rodando na porta 3001
```

---

## Dependências

| Pacote | Uso |
|---|---|
| `express` | Framework HTTP |
| `ethers` ^6.x | Interação com contratos Ethereum |
| `cors` | Cross-Origin Resource Sharing |
| `helmet` | Headers de segurança HTTP |
| `express-rate-limit` | Proteção contra abuso de endpoints |
| `dotenv` | Variáveis de ambiente |