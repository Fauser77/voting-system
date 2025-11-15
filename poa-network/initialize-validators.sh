#!/bin/bash
# Script para inicializar a blockchain do ZERO (bloco 0)
# Remove todos os dados anteriores e reinicializa com o genesis.json
# Compatível com start-validators.sh e stop-validators.sh

# Definição de cores para melhor legibilidade
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Inicializando Blockchain do ZERO (Bloco 0)               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Endereços dos validadores (extraídos do genesis.json)
VALIDATOR1_ADDRESS="0x1068cb9098a7e2db2942ff8b3837c7f3138b033d"
VALIDATOR2_ADDRESS="0x602e1b5b795bb2e81a40134663398189df0ea7cc"
VALIDATOR3_ADDRESS="0x6199b1276f8057e42ec3f9941d093428cad7437b"
VALIDATOR4_ADDRESS="0xd57603d7b8050326d8a5736691eb6ff250e18193"
VALIDATOR5_ADDRESS="0x49ada43943b216a50c255addd42aff6d8e427511"

# Pasta onde está o genesis.json
GENESIS_PATH="genesis.json"

# ═══════════════════════════════════════════════════════════
# VERIFICAÇÕES INICIAIS
# ═══════════════════════════════════════════════════════════

echo -e "\n${CYAN}[1/6] Verificando pré-requisitos...${NC}"

# Verifica se o genesis.json existe
if [ ! -f "$GENESIS_PATH" ]; then
    echo -e "${RED}✗ Erro: Arquivo $GENESIS_PATH não encontrado!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Arquivo genesis.json encontrado"

# Verifica se há processos Geth em execução
if pgrep -f geth > /dev/null; then
    echo -e "${YELLOW}⚠ Processos Geth em execução detectados.${NC}"
    echo -e "${YELLOW}  Será necessário encerrá-los para reinicializar a blockchain.${NC}"
    
    read -p "Deseja parar os validadores em execução? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${CYAN}Encerrando processos Geth...${NC}"
        
        # Tentar parar graciosamente
        for i in {1..5}; do
            if [ -S "validator$i/geth.ipc" ]; then
                GETH_PID=$(pgrep -f "geth.*validator$i")
                if [ -n "$GETH_PID" ]; then
                    kill -15 $GETH_PID 2>/dev/null || true
                fi
            fi
        done
        
        sleep 5
        
        # Se ainda houver processos, forçar encerramento
        if pgrep -f geth > /dev/null; then
            pkill -9 -f geth
            sleep 2
        fi
        
        echo -e "${GREEN}✓${NC} Processos Geth encerrados"
    else
        echo -e "${RED}✗ Operação cancelada. Encerre os validadores manualmente antes de continizar.${NC}"
        exit 1
    fi
fi

# ═══════════════════════════════════════════════════════════
# LIMPEZA DOS DADOS ANTIGOS
# ═══════════════════════════════════════════════════════════

echo -e "\n${CYAN}[2/6] Limpando dados antigos da blockchain...${NC}"

for i in {1..5}; do
    if [ -d "validator$i" ]; then
        echo -e "  ${YELLOW}→${NC} Limpando dados do validador $i..."
        
        # Remove diretórios de dados da blockchain, mas preserva keystore e password
        rm -rf "validator$i/geth" 2>/dev/null || true
        rm -f "validator$i/geth.ipc" 2>/dev/null || true
        rm -f "validator$i/validator$i.log" 2>/dev/null || true
        rm -rf "validator$i/history" 2>/dev/null || true
        
        echo -e "    ${GREEN}✓${NC} Dados removidos (keystore preservado)"
    else
        echo -e "  ${YELLOW}→${NC} Diretório validator$i não existe, será criado..."
        mkdir -p "validator$i"
    fi
done

# ═══════════════════════════════════════════════════════════
# VERIFICAÇÃO E CRIAÇÃO DE ARQUIVOS DE SENHA
# ═══════════════════════════════════════════════════════════

echo -e "\n${CYAN}[3/6] Verificando arquivos de senha...${NC}"

for i in {1..5}; do
    if [ -f "validator$i/password.txt" ]; then
        echo -e "  ${GREEN}✓${NC} Arquivo de senha existente para validador $i"
    else
        echo -e "  ${YELLOW}→${NC} Criando arquivo de senha padrão para validador $i..."
        mkdir -p "validator$i"
        echo "senha123" > "validator$i/password.txt"
        echo -e "    ${YELLOW}⚠ ATENÇÃO: Senha padrão criada. Altere para sua senha real!${NC}"
    fi
done

# Verifica se os keystores existem
MISSING_KEYSTORES=0
for i in {1..5}; do
    if [ ! "$(ls -A validator$i/keystore/ 2>/dev/null)" ]; then
        echo -e "  ${YELLOW}⚠${NC} Aviso: Keystore vazio ou inexistente para validador $i"
        MISSING_KEYSTORES=$((MISSING_KEYSTORES + 1))
    fi
done

if [ $MISSING_KEYSTORES -gt 0 ]; then
    echo -e "\n${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ATENÇÃO: $MISSING_KEYSTORES validador(es) sem keystore detectado(s)    ║${NC}"
    echo -e "${YELLOW}║  Certifique-se de criar as contas antes de iniciar!       ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
fi

# ═══════════════════════════════════════════════════════════
# REINICIALIZAÇÃO COM GENESIS.JSON
# ═══════════════════════════════════════════════════════════

echo -e "\n${CYAN}[4/6] Reinicializando blockchain com genesis.json...${NC}"

for i in {1..5}; do
    echo -e "  ${YELLOW}→${NC} Inicializando validador $i..."
    
    # Executa o init e captura a saída
    INIT_OUTPUT=$(geth --datadir validator$i init "$GENESIS_PATH" 2>&1)
    
    if echo "$INIT_OUTPUT" | grep -q "Successfully"; then
        echo -e "    ${GREEN}✓${NC} Validador $i inicializado com sucesso"
    else
        echo -e "    ${RED}✗${NC} Erro ao inicializar validador $i"
        echo "$INIT_OUTPUT"
    fi
done

# ═══════════════════════════════════════════════════════════
# VERIFICAÇÃO DA INICIALIZAÇÃO
# ═══════════════════════════════════════════════════════════

echo -e "\n${CYAN}[5/6] Verificando inicialização...${NC}"

ALL_INITIALIZED=true
for i in {1..5}; do
    # Verifica se o diretório geth foi criado e contém dados
    if [ -d "validator$i/geth" ]; then
        # Verifica se há chaindata ou lightchaindata
        if [ -d "validator$i/geth/chaindata" ] || [ -d "validator$i/geth/lightchaindata" ]; then
            # Verifica se há arquivos dentro do chaindata
            if [ "$(ls -A validator$i/geth/chaindata 2>/dev/null)" ] || [ "$(ls -A validator$i/geth/lightchaindata 2>/dev/null)" ]; then
                echo -e "  ${GREEN}✓${NC} Validador $i: Blockchain inicializada"
            else
                echo -e "  ${RED}✗${NC} Validador $i: Diretório chaindata vazio"
                ALL_INITIALIZED=false
            fi
        else
            echo -e "  ${RED}✗${NC} Validador $i: Diretório chaindata não encontrado"
            ALL_INITIALIZED=false
        fi
    else
        echo -e "  ${RED}✗${NC} Validador $i: Diretório geth não foi criado"
        ALL_INITIALIZED=false
    fi
done

# Se houve falha, mostra informações de debug
if [ "$ALL_INITIALIZED" = false ]; then
    echo -e "\n${YELLOW}Informações de debug:${NC}"
    for i in {1..5}; do
        if [ -d "validator$i" ]; then
            echo -e "\n${CYAN}Validador $i:${NC}"
            echo -e "  Estrutura de diretórios:"
            ls -la "validator$i/" 2>/dev/null | grep -E "^d" | awk '{print "    " $9}' || echo "    (erro ao listar)"
            
            if [ -d "validator$i/geth" ]; then
                echo -e "  Conteúdo de geth/:"
                ls -la "validator$i/geth/" 2>/dev/null | grep -E "^d" | awk '{print "    " $9}' || echo "    (vazio)"
            fi
        fi
    done
fi

# ═══════════════════════════════════════════════════════════
# RESUMO E PRÓXIMOS PASSOS
# ═══════════════════════════════════════════════════════════

echo -e "\n${CYAN}[6/6] Resumo da operação${NC}"

if [ "$ALL_INITIALIZED" = true ]; then
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ BLOCKCHAIN REINICIALIZADA COM SUCESSO!                 ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}Informações da rede:${NC}"
    echo -e "  • Chain ID: 12345"
    echo -e "  • Algoritmo de consenso: Clique (PoA)"
    echo -e "  • Período de bloco: 15 segundos"
    echo -e "  • Número de validadores: 5"
    echo -e "  • Bloco inicial: 0"
    
    echo -e "\n${BLUE}Próximos passos:${NC}"
    echo -e "  1. ${CYAN}Iniciar a rede:${NC}"
    echo -e "     ${GREEN}./start-validators.sh${NC}"
    echo -e ""
    echo -e "  2. ${CYAN}Parar a rede:${NC}"
    echo -e "     ${GREEN}./stop-validators.sh${NC}"
    echo -e ""
    echo -e "  3. ${CYAN}Reinicializar novamente (do zero):${NC}"
    echo -e "     ${GREEN}./initialize-validators.sh${NC}"
    
    echo -e "\n${YELLOW}Observações importantes:${NC}"
    echo -e "  • A blockchain foi completamente resetada para o bloco 0"
    echo -e "  • Todas as transações e blocos anteriores foram removidos"
    echo -e "  • Os arquivos de keystore e senha foram preservados"
    echo -e "  • A rede está pronta para ser iniciada com ./start-validators.sh"
    
else
    echo -e "\n${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ ERRO NA INICIALIZAÇÃO                                  ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${YELLOW}Verifique os erros acima e tente novamente.${NC}"
    exit 1
fi

echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"