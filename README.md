# Blockchain Voting System

Sistema de votação eletrônica descentralizado desenvolvido como Trabalho de Conclusão de Curso no IFSP Campus Piracicaba, curso de Engenharia de Computação.

**Autor:** João Fauser Sant'Anna Bragion  
**Orientador:** Prof. Me. Carlos Augusto Froldi

---

## Visão Geral

O sistema combina uma rede blockchain privada baseada em Ethereum com criptografia homomórfica ElGamal para permitir que votos sejam **contabilizados sem serem decifrados individualmente**. A identidade do eleitor é desvinculada de sua transação na rede através de um padrão de relayer anônimo.

### Propriedades garantidas

| Propriedade | Mecanismo |
|---|---|
| **Integridade** | Blockchain imutável — cada voto é registrado em bloco encadeado criptograficamente |
| **Imutabilidade** | Consenso PoA com 5 validadores — alteração exige maioria do consórcio |
| **Privacidade** | ElGamal Exponencial — votos permanecem cifrados durante toda a apuração |
| **Auditabilidade** | Agregação homomórfica + Prova Chaum-Pedersen — resultado verificável sem revelar votos |
| **Autenticidade** | ECDSA (secp256k1) — cada voto é assinado pela chave privada do eleitor |
| **Anonimato transacional** | Padrão relayer — o `from` na blockchain é o relayer, não o eleitor |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAMADA DE APRESENTAÇÃO                     │
│   ./frontend  —  React 18 SPA                                   │
│   Cifragem ElGamal local · Geração de chaves · Assinatura EIP-191│
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST
┌────────────────────────▼────────────────────────────────────────┐
│                       CAMADA DE SERVIÇOS                        │
│   ./api  —  Node.js + Express                                   │
│   Endpoints REST · Relayer Anônimo · Validação Off-chain        │
└────────────────────────┬────────────────────────────────────────┘
                         │ JSON-RPC / ethers.js
┌────────────────────────▼────────────────────────────────────────┐
│                        CAMADA DE LÓGICA                         │
│   ./blockchain  —  Solidity + Hardhat                           │
│   Voting.sol · Verificação ECDSA · Registro de Votos Cifrados   │
└────────────────────────┬────────────────────────────────────────┘
                         │ PoA / Clique
┌────────────────────────▼────────────────────────────────────────┐
│                    INFRAESTRUTURA DE REDE                       │
│   ./poa-network  —  Go Ethereum (Geth)                          │
│   Rede Privada · Consenso Clique · 5 Nós Validadores            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura do Repositório

```
voting-system/
├── README.md                  ← este arquivo
│
├── blockchain/                ← contratos, scripts e motor criptográfico
│   ├── contracts/
│   │   └── Voting.sol
│   ├── scripts/
│   │   ├── core/              ← ElGamal, provas, agregação, BSGS
│   │   ├── ops/               ← deploy, registro, apuração, fase
│   │   ├── tests/             ← benchmarks de throughput e apuração
│   │   └── tools/             ← gerador de parâmetros ElGamal
│   ├── config/                ← arquivos de configuração da eleição
│   └── hardhat.config.js
│
├── api/                       ← servidor Express (relayer)
│   └── src/
│       ├── routes/
│       │   ├── authorization.js
│       │   └── voting.js
│       ├── services/
│       │   └── blockchainService.js
│       └── server.js
│
├── frontend/                  ← aplicação React
│   └── src/
│       ├── components/
│       │   ├── Authorization/
│       │   ├── Voting/
│       │   ├── Results/
│       │   └── Menu/
│       ├── services/
│       ├── utils/
│       │   ├── elgamal.js     ← cifragem no browser
│       │   ├── signature.js   ← assinatura EIP-191
│       │   └── crypto.js      ← geração de chaves
│       └── styles/
│
└── poa-network/               ← rede blockchain privada
    ├── genesis.json
    ├── initialize-validators.sh
    ├── start-validators.sh
    ├── stop-validators.sh
    └── monitor-poa.sh
```

---

## Fluxo Completo da Eleição

### 1. Configuração (off-chain, autoridade eleitoral)

```bash
# Gerar parâmetros ElGamal de 256 bits (primo seguro p = 2q+1)
node blockchain/scripts/tools/elgamal-params-generator.js

# Inicializar e iniciar a rede PoA
cd poa-network
./initialize-validators.sh
./start-validators.sh

# Deploy do contrato (fase inicial: Registration)
cd blockchain
npx hardhat run scripts/ops/deploy.js --network poa
```

### 2. Registro de Eleitores (fase Registration)

O eleitor acessa o frontend, informa o CPF, e o sistema:
1. Valida o CPF contra a whitelist off-chain (`election-cpfs.json`)
2. Verifica se o CPF já foi usado on-chain (`checkCPFStatus`)
3. Gera par de chaves ECDSA **localmente no navegador**
4. Registra o endereço público na blockchain via API

### 3. Votação (fase Voting)

```bash
# Transição de fase pela autoridade
npx hardhat run scripts/ops/changePhase.js --network poa
# Selecionar: 1 (Voting)
```

O eleitor acessa o frontend, informa seu endereço público, escolhe o candidato e:
1. O voto é **cifrado localmente** com ElGamal Exponencial
2. O voto cifrado é **assinado** com a chave privada (EIP-191)
3. O pacote `{c1, c2, assinatura}` é enviado à API
4. O **relayer** submete o voto à blockchain — o `from` na rede é o relayer

### 4. Apuração (fase Ended)

```bash
# Encerrar votação
npx hardhat run scripts/ops/changePhase.js --network poa
# Selecionar: 2 (Ended)

# Executar apuração
npx hardhat run scripts/ops/monitor-blocks.js --network poa
```

O script de apuração:
1. Coleta todos os votos cifrados da blockchain
2. Executa **agregação homomórfica** — multiplica os cifertextos por candidato
3. Decifra o agregado com a chave privada `x`
4. Recupera a contagem via **Baby-step Giant-step** — O(√N)
5. Gera **Prova Chaum-Pedersen** para verificação independente
6. Publica resultados no contrato e persiste em `election-results.json`

---

## Pré-requisitos

| Ferramenta | Versão | Uso |
|---|---|---|
| Node.js | 18.x LTS | Todas as camadas JS |
| Go Ethereum (Geth) | 1.13.14-stable | Nós validadores |
| npm | 8+ | Gerenciamento de pacotes |

---

## Instalação Rápida

```bash
# Clonar o repositório
git clone https://github.com/Fauser77/voting-system.git
cd voting-system

# Instalar dependências de cada módulo
cd blockchain && npm install
cd ../api && npm install
cd ../frontend && npm install

# Configurar variáveis de ambiente
cp api/.env.example api/.env
# Editar api/.env com as chaves administrativas
```

Consulte o README de cada módulo para instruções detalhadas:

- [`blockchain/README.md`](./blockchain/README.md) — contratos, scripts, motor criptográfico
- [`api/README.md`](./api/README.md) — servidor relayer, endpoints REST
- [`frontend/README.md`](./frontend/README.md) — interface do eleitor
- [`poa-network/README.md`](./poa-network/README.md) — rede PoA, validadores

---

## Resultados Experimentais

| Eleitores | TPS | Tempo total de registro | Tempo de apuração criptográfica |
|---|---|---|---|
| 100 | ~19,8 | ~5s | <1 ms |
| 1.000 | ~20,0 | ~50s | ~5 ms |
| 5.000 | ~14,7 | ~5,7 min | ~12 ms |
| 10.000 | ~7,17 | ~23 min | ~20 ms |
| 20.000 | ~5,31 | ~62 min | ~30 ms |

O gargalo em escala não é a criptografia homomórfica, mas a interface RPC com a blockchain. Para mais de 5.000 eleitores, `getAllEncryptedVotes()` excede o gas limit de leitura do Geth, forçando consultas individuais por voto.

---

## Limitações Conhecidas

- **Chave privada centralizada:** a decriptação final depende de uma única chave `x`. Trabalhos futuros devem implementar Decriptação de Limiar (Shamir's Secret Sharing).
- **Receiptfreeness:** o `txHash` fornecido ao eleitor pode ser usado como recibo de voto, viabilizando coerção.
- **Escalabilidade nacional:** o sistema é viável para pleitos de até ~20.000 eleitores na configuração atual. Escalas maiores requerem camadas de indexação externa (The Graph, eventos em vez de storage reads).
- **Interface web:** produção exigiria hardware dedicado e supervisionado, análogo às urnas eletrônicas brasileiras.

---

## Referências Principais

- Nakamoto, S. (2008). *Bitcoin: A Peer-to-Peer Electronic Cash System*
- ElGamal, T. (1985). *A public key cryptosystem and a signature scheme based on discrete logarithms*
- Cramer, R., Gennaro, R., Schoenmakers, B. (1997). *A Secure and Optimally Efficient Multi-Authority Election Scheme*
- Adida, B. (2008). *Helios: Web-based Open-Audit Voting*
- Castro, M., Liskov, B. (1999). *Practical Byzantine Fault Tolerance*

---

## Licença

Este projeto foi desenvolvido para fins acadêmicos. Consulte o arquivo `LICENSE` para detalhes.