#!/bin/bash
# monitor-poa.sh - Script refatorado que combina monitor-poa-network.sh e check-validators.sh
# para monitorar a rede PoA e verificar os validadores de forma mais eficiente

# Definição de cores para melhor legibilidade
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Definir os nomes dos validadores para referência
declare -A VALIDATOR_NAMES
VALIDATOR_NAMES["0x1068cb9098a7e2db2942ff8b3837c7f3138b033d"]="Validador 1"
VALIDATOR_NAMES["0x602e1b5b795bb2e81a40134663398189df0ea7cc"]="Validador 2"
VALIDATOR_NAMES["0x6199b1276f8057e42ec3f9941d093428cad7437b"]="Validador 3"
VALIDATOR_NAMES["0xd57603d7b8050326d8a5736691eb6ff250e18193"]="Validador 4"
VALIDATOR_NAMES["0x49ada43943b216a50c255addd42aff6d8e427511"]="Validador 5"

# Diretório do validador principal para consultas
MAIN_VALIDATOR="validator1"

# Função para verificar se um validador está online
check_validator_online() {
    local validator_dir="$1"
    if [ -S "${validator_dir}/geth.ipc" ]; then
        return 0 # Está online
    else
        return 1 # Está offline
    fi
}

# Função para executar comandos no geth
geth_exec() {
    local validator_dir="$1"
    local command="$2"
    local result=$(geth --exec "$command" attach ${validator_dir}/geth.ipc 2>/dev/null)
    echo "$result"
}

# Função para imprimir cabeçalho
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Função para exibir status de um validador
show_validator_status() {
    local validator_num="$1"
    local validator_dir="validator${validator_num}"
    
    echo -e "${BLUE}=== Validador $validator_num ===${NC}"
    
    if check_validator_online "$validator_dir"; then
        echo -e "Status de conexão: ${GREEN}✅ Online${NC}"
        
        # Número de peers
        local peers=$(geth_exec "$validator_dir" "admin.peers.length")
        echo "Número de peers: $peers"
        
        # Número do bloco
        local block=$(geth_exec "$validator_dir" "eth.blockNumber")
        echo "Bloco atual: $block"
        
        # Status de mineração
        local mining=$(geth_exec "$validator_dir" "eth.mining")
        echo "Mineração ativa: $mining"
        
        # Saldo da conta
        local addr=$(geth_exec "$validator_dir" "eth.coinbase")
        local balance=$(geth_exec "$validator_dir" "web3.fromWei(eth.getBalance(eth.coinbase), 'ether')")
        local clean_addr=$(echo "$addr" | tr -d '"')
        local name="${VALIDATOR_NAMES[$clean_addr]:-Desconhecido}"
        
        echo "Nome: $name"
        echo "Endereço: $addr"
        echo "Saldo: $balance ETH"
    else
        echo -e "Status de conexão: ${RED}❌ Offline${NC}"
    fi
    echo ""
}

# Função para exibir histórico de blocos e validadores
show_block_history() {
    if ! check_validator_online "$MAIN_VALIDATOR"; then
        echo -e "${RED}Não foi possível conectar-se à rede. Verifique se os validadores estão em execução.${NC}"
        return 1
    fi
    
    print_header "Histórico de Blocos e seus Validadores"
    
    # Obter o snapshot do Clique
    local recents=$(geth_exec "$MAIN_VALIDATOR" "JSON.stringify(clique.getSnapshot().recents)")
    
    # Criar um arquivo temporário para processar os dados
    local temp_file=$(mktemp)
    echo "$recents" | tr '{' '\n' | tr '}' '\n' | tr ',' '\n' | grep ":" > "$temp_file"
    
    # Processar e exibir histórico de blocos
    while read line; do
        local block=$(echo "$line" | cut -d':' -f1 | tr -d '" ')
        local validator=$(echo "$line" | cut -d':' -f2 | tr -d '" ')
        
        # Obter o nome do validador se disponível
        local validator_name="${VALIDATOR_NAMES[$validator]:-Desconhecido}"
        
        echo "Bloco $block: $validator_name ($validator)"
    done < "$temp_file" | sort -n -k2
    
    rm "$temp_file"
}

# Função para exibir estatísticas por validador
show_validator_stats() {
    if ! check_validator_online "$MAIN_VALIDATOR"; then
        return 1
    fi
    
    print_header "Estatísticas por Validador"
    
    # Obter o snapshot do Clique
    local recents=$(geth_exec "$MAIN_VALIDATOR" "JSON.stringify(clique.getSnapshot().recents)")
    
    # Criar arquivo temporário para processar os dados
    local temp_file=$(mktemp)
    echo "$recents" | tr '{' '\n' | tr '}' '\n' | tr ',' '\n' | grep ":" | cut -d':' -f2 | tr -d '" ' | sort > "$temp_file"
    
    # Contar ocorrências de cada validador
    declare -A validator_counts
    while read validator; do
        validator_counts["$validator"]=$((${validator_counts["$validator"]:-0} + 1))
    done < "$temp_file"
    
    # Exibir contagem por validador
    for validator in "${!validator_counts[@]}"; do
        local count=${validator_counts["$validator"]}
        local validator_name="${VALIDATOR_NAMES[$validator]:-Desconhecido}"
        echo -e "${validator_name}: ${count} blocos"
    done
    
    rm "$temp_file"
    
    echo -e "\nBloco atual: $(geth_exec "$MAIN_VALIDATOR" "eth.blockNumber")"
}

# Função para exibir informações gerais da rede
show_network_info() {
    if ! check_validator_online "$MAIN_VALIDATOR"; then
        echo -e "${RED}Não foi possível conectar-se à rede. Verifique se os validadores estão em execução.${NC}"
        return 1
    fi
    
    print_header "Informações da Rede"
    
    # Lista de validadores
    echo "Validadores ativos:"
    local signers=$(geth_exec "$MAIN_VALIDATOR" "clique.getSigners()")
    echo "$signers"
    
    # Último bloco
    echo -e "\nInformações do último bloco:"
    local block_number=$(geth_exec "$MAIN_VALIDATOR" "eth.blockNumber")
    local last_block=$(geth_exec "$MAIN_VALIDATOR" "eth.getBlock(eth.blockNumber)")

    # Extrair número do bloco e outras informações básicas
    echo "$last_block" | grep -E "number|hash|timestamp|gasUsed"
    local recents=$(geth_exec "$MAIN_VALIDATOR" "JSON.stringify(clique.getSnapshot().recents)")
    local signer=$(geth_exec "$MAIN_VALIDATOR" "clique.getSigner(eth.getBlock(eth.blockNumber).hash)" | tr -d '"')
    echo "Signer: $signer"
    local signer_name="${VALIDATOR_NAMES[$signer]:-Desconhecido}"
    echo "Bloco selado por: $signer_name ($signer)"
}

# Função para calcular taxa de produção de blocos
calculate_block_rate() {
    if ! check_validator_online "$MAIN_VALIDATOR"; then
        return 1
    fi
    
    print_header "Taxa de Produção de Blocos"
    
    echo "Calculando taxa de blocos..."
    local block_now=$(geth_exec "$MAIN_VALIDATOR" "eth.blockNumber")
    echo "Bloco atual: $block_now"
    echo "Aguardando 60 segundos..."
    sleep 60
    local block_after=$(geth_exec "$MAIN_VALIDATOR" "eth.blockNumber")
    echo "Bloco após 60s: $block_after"
    
    local blocks_mined=$((block_after - block_now))
    local bps=$(echo "scale=2; $blocks_mined / 60" | bc)
    echo "blocks_mined: $blocks_mined"
    echo "Taxa de produção de blocos: $bps blocos/segundo"
    
    if [ $blocks_mined -gt 0 ]; then
        echo -e "${GREEN}✅ Rede está produzindo blocos normalmente${NC}"
    else
        echo -e "${YELLOW}⚠️ Nenhum bloco produzido nos últimos 60 segundos!${NC}"
    fi
}

# Menu principal
show_menu() {
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}      MONITORAMENTO DA REDE POA         ${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo "Data e hora: $(date)"
    echo -e "${BLUE}-----------------------------------------${NC}"
    echo "1. Status de todos os validadores"
    echo "2. Histórico de blocos e validadores"
    echo "3. Estatísticas por validador"
    echo "4. Informações da rede"
    echo "5. Calcular taxa de produção de blocos"
    echo "6. Executar monitoramento completo"
    echo "7. Monitoramento contínuo (atualização a cada 60s)"
    echo "0. Sair"
    echo -e "${BLUE}-----------------------------------------${NC}"
    echo -n "Escolha uma opção: "
}

# Função para mostrar status de todos os validadores
show_all_validators() {
    print_header "Status de Todos os Validadores"
    for i in {1..5}; do
        show_validator_status "$i"
    done
}

# Função para executar monitoramento completo
run_full_monitoring() {
    clear
    echo -e "${BLUE}=== MONITORAMENTO COMPLETO DA REDE POA ===${NC}"
    echo "Data e hora: $(date)"
    echo ""
    
    show_all_validators
    show_block_history
    show_validator_stats
    show_network_info
    calculate_block_rate
    
    echo -e "\n${BLUE}=== Fim do Monitoramento Completo ===${NC}"
}

# Função para executar monitoramento contínuo
run_continuous_monitoring() {
    local interval=60
    echo -e "${YELLOW}Iniciando monitoramento contínuo (Ctrl+C para parar)...${NC}"
    echo -e "${YELLOW}Atualização a cada ${interval} segundos${NC}"
    
    trap 'echo -e "\n${YELLOW}Monitoramento contínuo interrompido.${NC}"; exit 0' INT
    
    while true; do
        clear
        run_full_monitoring
        echo -e "\n${YELLOW}Próxima atualização em ${interval} segundos. Pressione Ctrl+C para parar.${NC}"
        sleep $interval
    done
}

# Execução principal com menu interativo
if [ "$1" == "--full" ]; then
    run_full_monitoring
    exit 0
elif [ "$1" == "--continuous" ]; then
    run_continuous_monitoring
    exit 0
fi

# Menu interativo
while true; do
    clear
    show_menu
    read choice
    
    case $choice in
        1) clear; show_all_validators; read -p "Pressione Enter para continuar..." ;;
        2) clear; show_block_history; read -p "Pressione Enter para continuar..." ;;
        3) clear; show_validator_stats; read -p "Pressione Enter para continuar..." ;;
        4) clear; show_network_info; read -p "Pressione Enter para continuar..." ;;
        5) clear; calculate_block_rate; read -p "Pressione Enter para continuar..." ;;
        6) clear; run_full_monitoring; read -p "Pressione Enter para continuar..." ;;
        7) clear; run_continuous_monitoring ;;
        0) echo "Saindo..."; exit 0 ;;
        *) echo -e "${RED}Opção inválida. Pressione Enter para continuar...${NC}"; read ;;
    esac
done