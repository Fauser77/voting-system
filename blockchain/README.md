# blockchain/

Camada de lógica do sistema de votação. Contém o contrato inteligente `Voting.sol`, o motor criptográfico ElGamal modularizado, e todos os scripts de operação, testes e ferramentas.

---

## Estrutura

```
blockchain/
├── contracts/
│   └── Voting.sol               ← contrato principal (Ballot)
│
├── config/
│   ├── elgamal-params.json      ← p, g, h, x  ⚠️ PRIVADO — não commitar
│   ├── public-config.json       ← p, g, h, endereço do contrato (sem x)
│   ├── election-config.json     ← candidatos + endereços autorizados
│   └── election-cpfs.json       ← whitelist de CPFs autorizados
│
├── results/
│   ├── election-results.json    ← resultado final + prova Chaum-Pedersen
│   └── encrypted-results.json  ← agregado cifrado (sem chave privada)
│
├── scripts/
│   ├── core/
│   │   ├── elgamal-crypto.js    ← modPow, modInverse, encryptVote, decryptValue
│   │   ├── elgamal-proof.js     ← protocolo Chaum-Pedersen (geração + verificação)
│   │   ├── elgamal-aggregation.js ← agregação homomórfica + BSGS + HeliosDecoder
│   │   ├── elgamal-config.js    ← carregamento de configuração + instância do contrato
│   │   ├── elgamal-utils.js     ← re-exporta todos os módulos acima
│   │   └── signature-utils.js  ← signVoteData + validatePrivateKey
│   │
│   ├── ops/
│   │   ├── deploy.js            ← deploy do contrato na rede PoA
│   │   ├── authorize-voter.js   ← registro interativo de eleitor (CLI)
│   │   ├── changePhase.js       ← transição de fase (Registration/Voting/Ended)
│   │   ├── interact.js          ← votação via CLI (teste/debug)
│   │   └── monitor-blocks.js    ← apuração: coleta, agregação, decriptação, prova
│   │
│   ├── tests/
│   │   ├── throughput.js        ← benchmark de TPS e gas por voto
│   │   ├── full-tally.js        ← benchmark de apuração completa (fluxo real)
│   │   └── tallying.js          ← benchmark isolado do motor criptográfico
│   │
│   └── tools/
│       └── elgamal-params-generator.js ← gera primo seguro + par de chaves ElGamal
│
├── artifacts/                   ← gerado pelo Hardhat (não commitar)
├── accounts.config.js           ← chaves privadas dos validadores PoA
├── hardhat.config.js
└── package.json
```

---

## Contrato Inteligente — `Voting.sol`

### Estruturas de dados

```solidity
struct Voter {
    bool hasRightToVote;
    bool hasVoted;
}

struct EncryptedVote {
    uint256[] c1_values;   // componente 1 do ElGamal, um por candidato
    uint256[] c2_values;   // componente 2 do ElGamal, um por candidato
    uint256 timestamp;
    address relayer;
}
```

### Máquina de estados

```
Registration ──► Voting ──► Ended
```

Transições são irreversíveis na lógica de negócio (o `setPhase` não valida regressão por decisão de projeto para facilitar testes). Em produção, o `require` de regressão de fase deve ser reativado.

### Funções principais

| Função | Quem chama | Fase | O que faz |
|---|---|---|---|
| `registerVoterWithCPF(addr, hash)` | Admin (via API) | Registration | Marca CPF como usado, autoriza endereço |
| `submitEncryptedVote(c1, c2, sig, voter)` | Relayer | Voting | Verifica assinatura ECDSA, registra voto cifrado |
| `setPhase(n)` | Admin | qualquer | Avança a fase da eleição |
| `getAllEncryptedVotes()` | Scripts off-chain | Ended | Retorna todos os votos (limitado por gas) |
| `publishResults(counts, winner)` | Admin | Ended | Persiste resultado final on-chain |
| `checkCPFStatus(hash)` | API | qualquer | Verifica se CPF já foi registrado |

### Verificação de assinatura (mecanismo central)

O contrato verifica que o voto foi realmente assinado pelo eleitor declarado, sem que o eleitor precise submeter a transação diretamente:

```solidity
// 1. Reconstrói o hash dos dados cifrados
bytes32 messageHash = keccak256(abi.encode(_c1_values, _c2_values));

// 2. Adiciona o prefixo padrão Ethereum (EIP-191)
bytes32 ethSignedMessageHash = keccak256(abi.encodePacked(
    "\x19Ethereum Signed Message:\n32",
    messageHash
));

// 3. Recupera o endereço que produziu a assinatura
address signer = recoverSigner(ethSignedMessageHash, _signature);

// 4. Exige que o assinante seja o eleitor declarado
require(signer == _voter, "Assinatura invalida para este eleitor");
```

**Por que `abi.encode` e não `abi.encodePacked`?**  
`abi.encode` é determinístico e corresponde exatamente ao `AbiCoder.defaultAbiCoder().encode()` do ethers.js v6. `encodePacked` com arrays dinâmicos pode produzir colisões e não tem correspondência direta segura no frontend.

---

## Motor Criptográfico ElGamal

### Parâmetros

- **Primo `p`:** primo seguro de 256 bits (`p = 2q + 1`, onde `q` também é primo)
- **Gerador `g`:** elemento de ordem `q` no grupo multiplicativo mod `p`
- **Chave pública `h`:** `h = g^x mod p`
- **Chave privada `x`:** mantida pela autoridade eleitoral, **nunca exposta on-chain**

### Variante Exponencial (por que não o ElGamal clássico)

O ElGamal clássico é multiplicativamente homomórfico: `E(m1) * E(m2) = E(m1 * m2)`. Sistemas de votação precisam de **soma**, não produto. A solução é mapear o voto para o expoente do gerador:

```
mensagem cifrada = g^voto  (onde voto ∈ {0, 1})
```

Assim, multiplicar dois cifertextos resulta em:

```
E(g^v1) * E(g^v2) = E(g^(v1+v2))
```

A decriptação retorna `g^(soma_total)`. Para extrair o inteiro, usa-se BSGS.

### Cifragem (por candidato)

```javascript
// r = nonce aleatório único para cada operação
const c1 = modPow(g, r, p);              // c1 = g^r mod p
const m_encoded = modPow(g, vote, p);    // g^0=1 (não escolhido) ou g^1=g (escolhido)
const c2 = (m_encoded * modPow(h, r, p)) % p;  // c2 = g^voto * h^r mod p
```

O nonce `r` garante encriptação probabilística: dois votos no mesmo candidato produzem cifertextos matematicamente diferentes.

### Agregação Homomórfica

```javascript
// Para cada candidato k:
let c1_agg = 1n;
let c2_agg = 1n;
for (const vote of votes) {
    c1_agg = (c1_agg * vote[k].c1) % p;
    c2_agg = (c2_agg * vote[k].c2) % p;
}
// c1_agg e c2_agg formam E(g^(total_votos_candidato_k))
```

### Decriptação

```javascript
const s = modPow(c1_agg, x, p);         // s = C1^x mod p
const s_inv = modInverse(s, p);          // inverso modular
const m_prime = (c2_agg * s_inv) % p;   // M' = g^(total_votos)
```

### Baby-step Giant-step — O(√N)

Para resolver `g^k = M'` no espaço `[0, N]`:

```javascript
const m = ceil(sqrt(N));

// Baby steps: tabela g^0, g^1, ..., g^m
const table = new Map();
for (let i = 0n; i <= m; i++) {
    table.set(current.toString(), i);
    current = (current * g) % p;
}

// Giant steps: M' * (g^-m)^j até encontrar colisão
const gInvM = modInverse(modPow(g, m, p), p);
for (let j = 0n; j <= m; j++) {
    if (table.has(gamma.toString())) return j * m + i;
    gamma = (gamma * gInvM) % p;
}
```

Complexidade: O(√N) em tempo e espaço, viável porque N ≤ total de eleitores.

### Prova Chaum-Pedersen

Prova de conhecimento zero que atesta que o resultado foi decifrado com a chave privada correta, sem revelar essa chave:

1. Gera `w` aleatório → calcula `a = g^w mod p`, `b = C1^w mod p`
2. Deriva desafio `e = SHA256(c1, c2, M', a, b)`
3. Calcula resposta `s = w + e*x mod (p-1)`
4. Verificador checa: `g^s = a * h^e` e `C1^s = b * (C2/M')^e`

---

## Scripts de Operação

### Sequência de uso em produção

```bash
# 0. Gerar parâmetros ElGamal (uma vez por eleição)
node scripts/tools/elgamal-params-generator.js

# 1. Editar config/election-config.json com candidatos
# 2. Editar config/election-cpfs.json com CPFs autorizados

# 3. Deploy
npx hardhat run scripts/ops/deploy.js --network poa

# 4. [Usuários se registram via frontend/API durante fase Registration]

# 5. Iniciar votação
npx hardhat run scripts/ops/changePhase.js --network poa
# → Selecionar: 1

# 6. [Usuários votam via frontend durante fase Voting]

# 7. Encerrar votação
npx hardhat run scripts/ops/changePhase.js --network poa
# → Selecionar: 2

# 8. Apurar resultados
ELGAMAL_PRIVATE_KEY=<x> npx hardhat run scripts/ops/monitor-blocks.js --network poa
```

### Benchmarks disponíveis

```bash
# TPS e gas por voto (deploy + registro + votação em lote)
npx hardhat run scripts/tests/throughput.js --network poa

# Apuração no contrato real (coleta RPC + agregação + decriptação)
npx hardhat run scripts/tests/full-tally.js --network poa <CONTRACT_ADDRESS>

# Motor criptográfico isolado (sem rede)
node scripts/tests/tallying.js
```

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz de `blockchain/`:

```env
RELAYER_PRIVATE_KEY=0x...    # chave da conta relayer (segunda conta Hardhat)
ELGAMAL_PRIVATE_KEY=...      # chave privada x para decriptação (sem 0x)
```

---

## Instalação

```bash
cd blockchain
npm install
```

**Dependências principais:**

| Pacote | Versão | Uso |
|---|---|---|
| `hardhat` | ^2.x | Compilação, deploy, scripts |
| `@nomicfoundation/hardhat-toolbox` | ^3.x | Suite completa Hardhat |
| `ethers` | ^6.x | Interação com contratos |
| `dotenv` | ^16.x | Variáveis de ambiente |

---

## Notas de Segurança

- `elgamal-params.json` contém a chave privada `x` e **nunca deve ser versionado**. Adicione ao `.gitignore`.
- `accounts.config.js` contém chaves privadas dos validadores PoA e **nunca deve ser versionado**.
- Em produção, a chave privada `x` deve ser gerenciada por um HSM ou esquema de Decriptação de Limiar (Shamir's Secret Sharing) distribuído entre múltiplas autoridades.