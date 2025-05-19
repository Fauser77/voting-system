#!/bin/bash
# Script para parar os validadores de forma limpa e sem mensagens de erro

# Definição de cores para melhor legibilidade
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Parando os validadores de forma limpa ===${NC}"

# Função para executar comandos geth silenciosamente
geth_exec_silent() {
    local validator_dir="$1"
    local command="$2"
    geth --exec "$command" attach ${validator_dir}/geth.ipc 2>/dev/null || true
}

# Parar validadores de forma limpa
for i in {1..5}; do
    if [ -S "validator$i/geth.ipc" ]; then
        echo -e "Parando validador $i graciosamente... ${YELLOW}(pode demorar alguns segundos)${NC}"
        
        # Parar mineração e serviços RPC sem usar quit() ou exit()
        geth_exec_silent "validator$i" "miner.stop()" >/dev/null
        geth_exec_silent "validator$i" "admin.stopRPC()" >/dev/null
        geth_exec_silent "validator$i" "admin.stopWS()" >/dev/null
        
        # Em vez de usar admin.quit(), vamos simplesmente usar o método de encerramento com sinal
        GETH_PID=$(pgrep -f "geth.*validator$i")
        if [ -n "$GETH_PID" ]; then
            kill -15 $GETH_PID 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✓${NC} Comando enviado"
    else
        echo -e "Validador $i ${RED}não está em execução${NC}"
    fi
done

echo -e "\n${YELLOW}Aguardando validadores pararem graciosamente...${NC}"
sleep 5

# Verificar se algum processo ainda está rodando
REMAINING=$(pgrep -f "geth.*validator[1-5]")
if [ -n "$REMAINING" ]; then
    echo -e "${YELLOW}Alguns processos geth ainda estão rodando. Enviando sinal de encerramento...${NC}"
    pkill -15 -f "geth.*validator[1-5]"
    sleep 3
fi

# Verificação final e uso de SIGKILL se necessário
REMAINING=$(pgrep -f "geth.*validator[1-5]")
if [ -n "$REMAINING" ]; then
    echo -e "${RED}Alguns processos ainda persistem. Usando SIGKILL para encerrar...${NC}"
    pkill -9 -f "geth.*validator[1-5]"
    sleep 1
fi

# Confirmar que todos os processos foram encerrados
if ! pgrep -f "geth.*validator[1-5]" >/dev/null; then
    echo -e "\n${GREEN}✅ Todos os validadores foram parados com sucesso.${NC}"
else
    echo -e "\n${RED}⚠️ AVISO: Ainda existem processos geth em execução. Verifique manualmente:${NC}"
    ps aux | grep -E "geth.*validator[1-5]" | grep -v grep
fi

# Remover arquivos IPC órfãos, se existirem
for i in {1..5}; do
    if [ -S "validator$i/geth.ipc" ]; then
        echo -e "Removendo arquivo IPC do validador $i..."
        rm -f "validator$i/geth.ipc"
    fi
done

echo -e "\n${BLUE}=== Operação concluída ===${NC}"