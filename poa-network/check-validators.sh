#!/bin/bash
# check-validators.sh - Verifica quais validadores produziram os blocos recentes

# Definir os nomes dos validadores para referência
declare -A VALIDATOR_NAMES
VALIDATOR_NAMES["0x1068cb9098a7e2db2942ff8b3837c7f3138b033d"]="Validador 1"
VALIDATOR_NAMES["0x602e1b5b795bb2e81a40134663398189df0ea7cc"]="Validador 2"
VALIDATOR_NAMES["0x6199b1276f8057e42ec3f9941d093428cad7437b"]="Validador 3"
VALIDATOR_NAMES["0xd57603d7b8050326d8a5736691eb6ff250e18193"]="Validador 4"
VALIDATOR_NAMES["0x49ada43943b216a50c255addd42aff6d8e427511"]="Validador 5"

# Obter o snapshot do Clique
RECENTS=$(geth --exec "JSON.stringify(clique.getSnapshot().recents)" attach validator1/geth.ipc)

# Converter para formato mais legível
echo "=== Histórico de Blocos e seus Validadores ==="
echo "$RECENTS" | tr '{' '\n' | tr '}' '\n' | tr ',' '\n' | grep ":" | while read line; do
  BLOCK=$(echo "$line" | cut -d':' -f1 | tr -d '" ')
  VALIDATOR=$(echo "$line" | cut -d':' -f2 | tr -d '" ')
  
  # Obter o nome do validador se disponível
  VALIDATOR_NAME="${VALIDATOR_NAMES[$VALIDATOR]:-Desconhecido}"
  
  echo "Bloco $BLOCK: $VALIDATOR_NAME ($VALIDATOR)"
done | sort -n -k2

echo ""
echo "=== Estatísticas por Validador ==="
echo "$RECENTS" | tr '{' '\n' | tr '}' '\n' | tr ',' '\n' | grep ":" | cut -d':' -f2 | tr -d '" ' | sort | uniq -c | while read count validator; do
  VALIDATOR_NAME="${VALIDATOR_NAMES[$validator]:-Desconhecido}"
  echo "$VALIDATOR_NAME: $count blocos"
done

echo ""
echo "Bloco atual: $(geth --exec "eth.blockNumber" attach validator1/geth.ipc)"