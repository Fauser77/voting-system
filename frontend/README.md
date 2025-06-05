# Frontend do Sistema de Votação

Interface web para o sistema de votação blockchain, desenvolvida em React com Material-UI.

## Estrutura de Arquivos

```
frontend/
├── public/              # Arquivos públicos estáticos
├── src/
│   ├── components/      # Componentes reutilizáveis
│   │   ├── common/      # Header, Footer, Loading
│   │   ├── auth/        # LoginForm, AccountSelector
│   │   ├── voting/      # Componentes de votação
│   │   ├── admin/       # Componentes administrativos
│   │   └── results/     # Visualização de resultados
│   ├── pages/           # Páginas principais da aplicação
│   ├── services/        # Serviços e integrações
│   ├── contexts/        # React Contexts (Web3, Auth)
│   ├── utils/           # Utilitários e constantes
│   └── styles/          # Estilos globais e tema
└── .env.local           # Configurações de ambiente

```

## Funcionalidades

### Para Eleitores
- Login com chave privada ou conta de teste
- Visualização de candidatos disponíveis
- Interface para votação (se tiver permissão)
- Acompanhamento do status do voto
- Visualização de resultados públicos

### Para Administrador (Chairperson)
- Gerenciamento de permissões de voto
- Monitoramento do progresso da eleição
- Visualização de estatísticas em tempo real
- Controle total sobre o processo eleitoral

## Tecnologias Utilizadas

- **React 18**: Framework principal
- **Material-UI v5**: Componentes de interface
- **Ethers.js v6**: Integração com blockchain
- **React Router v6**: Navegação SPA
- **Context API**: Gerenciamento de estado

## Como Executar

### Pré-requisitos

1. Node.js >= 14.0.0
2. Rede PoA rodando (porta 8545)
3. Contrato implantado na rede

### Instalação

```bash
cd frontend
npm install
```

### Configuração

Edite o arquivo `.env.local` se necessário:

```env
REACT_APP_RPC_URL=http://localhost:8545
REACT_APP_CONTRACT_ADDRESS=0x7b695a12d79C23d73f2e7a563F51A519369B8b1d
```

### Execução

```bash
npm start
```

Acesse: http://localhost:3000

## Contas de Teste

Para desenvolvimento, use as contas pré-configuradas:

- **Administrador**: Chairperson (gerencia permissões)
- **Eleitor 1-4**: Contas para testar votação

## Fluxo de Uso

1. **Login**: Selecione uma conta de teste ou use chave privada
2. **Dashboard**: Acesso baseado no tipo de usuário
3. **Votação**: Eleitores com permissão podem votar
4. **Resultados**: Visualização pública dos resultados

## Scripts Disponíveis

```bash
npm start       # Inicia servidor de desenvolvimento
npm build       # Gera build de produção
npm test        # Executa testes
```

## Segurança

⚠️ **IMPORTANTE**: As chaves privadas no sistema são apenas para desenvolvimento.

## Arquitetura

- **Contexts**: Gerenciam estado global (Web3, Autenticação)
- **Services**: Abstraem lógica de negócio e blockchain
- **Components**: UI modular e reutilizável
- **Pages**: Containers principais com lógica específica