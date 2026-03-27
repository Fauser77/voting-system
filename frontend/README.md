# frontend/

Interface web do sistema de votação. Aplicação React de página única (SPA) que executa todas as operações criptográficas sensíveis **diretamente no navegador do eleitor**, garantindo que a chave privada e o conteúdo do voto jamais trafeguem pela rede em texto claro.

---

## Princípio de Design: Criptografia no Cliente

```
Navegador do Eleitor
┌──────────────────────────────────────────┐
│  window.crypto.getRandomValues()         │
│         ↓                                │
│  Geração de chaves ECDSA (secp256k1)     │
│         ↓                                │
│  Cifragem ElGamal (BigInt nativo)        │
│         ↓                                │
│  Assinatura EIP-191 (ethers.js)          │
│         ↓                                │
│  {c1_values, c2_values, signature}  ──►  │ → API
│                                          │
│  chave privada: NUNCA sai daqui          │
└──────────────────────────────────────────┘
```

---

## Estrutura

```
frontend/src/
├── components/
│   ├── Menu/
│   │   ├── Menu.jsx           ← página inicial com 3 opções
│   │   └── Menu.css
│   │
│   ├── Authorization/
│   │   ├── AuthorizationForm.jsx  ← fluxo de registro em 4 etapas
│   │   ├── AuthorizationForm.css
│   │   ├── KeyDisplay.jsx         ← exibição segura das credenciais geradas
│   │   └── KeyDisplay.css
│   │
│   ├── Voting/
│   │   ├── VotingForm.jsx     ← fluxo de votação em 5 etapas (máquina de estados)
│   │   ├── VotingForm.css
│   │   ├── VoteSearch.jsx     ← consulta de voto por txHash
│   │   └── VoteSearch.css
│   │
│   └── Results/
│       ├── ElectionResultsPage.jsx ← exibição dos resultados finais
│       └── ElectionResultsPage.css
│
├── services/
│   ├── api.js                 ← axios configurado para /api/authorization
│   └── votingApi.js           ← axios configurado para /api/voting
│
├── utils/
│   ├── crypto.js              ← generateKeyPair, formatCPF, copyToClipboard
│   ├── elgamal.js             ← encryptVote, validateEncryptedVote
│   └── signature.js           ← signVoteData, validatePrivateKey, verifySignature
│
├── styles/
│   ├── design-system.css      ← sistema de design (variáveis, componentes base)
│   └── globals.css
│
└── App.jsx                    ← roteamento React Router
```

---

## Fluxos de Usuário

### Registro (`/registro`)

Componente: `AuthorizationForm.jsx`

A interface guia o eleitor por 5 etapas exibidas como steps visuais:

```
[1] Validando CPF → [2] Verificando blockchain → [3] Gerando credenciais → [4] Registrando → [5] Concluído
```

**Etapa 1-2 — Validação (API):**
```javascript
const validationResult = await authorizationService.validateCPF(cpf);
// POST /api/authorization/validate-cpf
// Retorna: { success, cpfHash }
```

**Etapa 3 — Geração de chaves (browser):**
```javascript
// crypto.js
const wallet = ethers.Wallet.createRandom();
// ethers.js usa window.crypto.getRandomValues() internamente
return { privateKey: wallet.privateKey, address: wallet.address };
```

**Etapa 4 — Registro on-chain (via API):**
```javascript
await authorizationService.registerVoter(keys.address, cpfHash);
// POST /api/authorization/register
```

**Exibição das credenciais (`KeyDisplay.jsx`):**
- Chave privada ocultada por padrão com botão "Mostrar/Ocultar"
- Download em `.txt` com avisos de segurança
- Checkbox de confirmação obrigatório antes de prosseguir
- Botão de cópia para clipboard

---

### Votação (`/votacao`)

Componente: `VotingForm.jsx`

Máquina de estados com 5 etapas (`STEPS` enum):

```
ADDRESS(0) → CANDIDATE(1) → PRIVATE_KEY(2) → CONFIRM(3) → SUCCESS(4)
```

**Etapa 0 — Autenticação por endereço:**
```javascript
const result = await votingService.authenticateVoter(voterAddress);
// POST /api/voting/authenticate
// Retorna: { candidates, elgamalParams }
```

**Etapa 2 — Validação da chave privada (local):**
```javascript
// signature.js
const v = validatePrivateKey(privateKey);
// Verifica formato + deriva endereço e compara com voterAddress
if (v.address.toLowerCase() !== voterAddress.toLowerCase())
    throw new Error('Chave não corresponde ao endereço');
```

**Etapa 3 — Cifragem + assinatura + envio:**
```javascript
// 1. Cifrar (elgamal.js)
const { c1_values, c2_values } = encryptVote(
    selectedCandidate.index,
    voterData.candidates.length,
    voterData.elgamalParams
);

// 2. Validar (elgamal.js)
const validation = validateEncryptedVote(c1_values, c2_values, n, p);

// 3. Assinar (signature.js)
const signature = await signVoteData({ c1_values, c2_values }, privateKey);

// 4. Enviar (votingApi.js)
const result = await votingService.submitVote(
    voterAddress, c1_values, c2_values, signature
);
```

---

### Consulta de Voto (`VoteSearch.jsx`)

Acessível a partir da tela de votação. O eleitor informa o `txHash` recebido após votar para verificar se seu voto está na blockchain:

```javascript
// GET /api/voting/search/:txHash
```

Exibe os valores cifrados `c1` e `c2` por candidato (truncados por padrão, expansíveis). A interface deixa explícito que os valores são criptografados e não revelam a escolha.

---

### Resultados (`/resultados`)

Componente: `ElectionResultsPage.jsx`

```javascript
// GET /api/voting/results
```

Exibe:
- Vencedor em destaque com troféu animado
- Barra de progresso por candidato com percentual
- Estatísticas de participação (autorizados / votaram / %)
- Data e hora da apuração

---

## Utilitários Criptográficos

### `utils/elgamal.js` — Cifragem no Browser

```javascript
export function encryptVote(candidateIndex, numCandidates, params) {
    const p = BigInt(params.p);
    const g = BigInt(params.g);
    const h = BigInt(params.h);

    for (let i = 0; i < numCandidates; i++) {
        const vote = (i === candidateIndex) ? 1n : 0n;

        // Nonce aleatório seguro via Web Crypto API
        const r = getSecureRandom(p - 1n);

        const c1 = modPow(g, r, p);                          // g^r mod p
        const m_encoded = modPow(g, vote, p);                // g^0=1 ou g^1=g
        const c2 = (m_encoded * modPow(h, r, p)) % p;       // g^voto * h^r mod p

        c1_values.push(c1.toString());
        c2_values.push(c2.toString());
    }
}
```

**Por que `BigInt` nativo?**  
JavaScript `Number` tem precisão de 53 bits. Os parâmetros ElGamal têm 256 bits. `BigInt` é necessário para aritmética exata sem bibliotecas externas.

**Por que `window.crypto.getRandomValues()`?**  
`Math.random()` não é criptograficamente seguro. A Web Crypto API provê entropia do sistema operacional.

---

### `utils/signature.js` — Assinatura EIP-191

```javascript
export async function signVoteData(voteData, privateKey) {
    const wallet = new ethers.Wallet(privateKey);

    // Replica exatamente o abi.encode do contrato Solidity
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedData = abiCoder.encode(
        ['uint256[]', 'uint256[]'],
        [c1Array, c2Array]
    );

    const messageHash = ethers.keccak256(encodedData);

    // wallet.signMessage() adiciona automaticamente o prefixo EIP-191:
    // "\x19Ethereum Signed Message:\n32"
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return signature;
}
```

**Correspondência crítica com o contrato:**  
O contrato usa `keccak256(abi.encode(c1_values, c2_values))` — não `encodePacked`. O frontend usa `AbiCoder.defaultAbiCoder().encode(...)` — que é a representação JS de `abi.encode`. Qualquer divergência faz `ecrecover` retornar um endereço errado e o voto é rejeitado.

---

### `utils/crypto.js` — Utilitários Gerais

```javascript
// Geração de par de chaves
export function generateKeyPair() {
    const wallet = ethers.Wallet.createRandom();
    return { privateKey: wallet.privateKey, address: wallet.address };
}

// Formatação de CPF para exibição
export function formatCPF(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Cópia segura para clipboard
export async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
    } else {
        // fallback via textarea + execCommand para ambientes não-HTTPS
    }
}
```

---

## Sistema de Design

O frontend segue o padrão visual do **gov.br**, implementado em `design-system.css`:

```css
:root {
    --color-primary:      #1351B4;   /* azul governo */
    --color-primary-dark: #0C326F;
    --color-yellow:       #FFCD07;   /* amarelo governo */
    --color-green:        #168821;   /* verde governo */
    --font-display:       'Raleway', sans-serif;
    --font-body:          'Rawline', sans-serif;
}
```

A barra superior tricolor (`gov-stripe`) e o header escuro são elementos visuais intencionais para remeter à identidade de sistemas governamentais brasileiros.

**Componentes base disponíveis:**
- `.card`, `.card--elevated` — containers com borda e sombra
- `.btn--primary`, `.btn--secondary`, `.btn--success` — botões com estados
- `.alert--error/warning/info/success` — mensagens com cor semântica
- `.badge--green/blue/yellow` — etiquetas de status
- `.form-input`, `.form-label`, `.form-hint` — campos de formulário
- `.animate-in` — animação de entrada (fadeIn + translateY)

---

## Variáveis de Ambiente

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_API_TIMEOUT=30000
```

---

## Instalação e Execução

```bash
cd frontend
npm install

# Desenvolvimento
npm start
# Disponível em http://localhost:3000

# Build de produção
npm run build
```

---

## Dependências

| Pacote | Uso |
|---|---|
| `react` ^18 | Framework UI |
| `react-router-dom` | Roteamento SPA |
| `ethers` ^6.x | Geração de chaves, assinatura, utilitários Ethereum |
| `axios` | Requisições HTTP para a API |

**Sem dependências criptográficas externas além do ethers.js.**  
A cifragem ElGamal usa apenas `BigInt` nativo do JavaScript e `window.crypto.getRandomValues()` do browser.