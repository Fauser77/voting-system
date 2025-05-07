#!/bin/bash
# Script para iniciar os validadores usando a estrutura existente
# Com correções para problemas de peers e mineração de blocos

# Endereços dos validadores (extraídos do genesis.json)
VALIDATOR1_ADDRESS="0x1068cb9098a7e2db2942ff8b3837c7f3138b033d"
VALIDATOR2_ADDRESS="0x602e1b5b795bb2e81a40134663398189df0ea7cc"
VALIDATOR3_ADDRESS="0x6199b1276f8057e42ec3f9941d093428cad7437b"
VALIDATOR4_ADDRESS="0xd57603d7b8050326d8a5736691eb6ff250e18193"
VALIDATOR5_ADDRESS="0x49ada43943b216a50c255addd42aff6d8e427511"

# Pasta onde está o genesis.json
GENESIS_PATH="genesis.json"

# Verifica se o genesis.json existe
if [ ! -f "$GENESIS_PATH" ]; then
    echo "Erro: Arquivo $GENESIS_PATH não encontrado!"
    exit 1
fi

# Verifica se os diretórios dos validadores existem
for i in {1..5}; do
    if [ ! -d "validator$i" ]; then
        echo "Erro: Diretório validator$i não encontrado!"
        exit 1
    fi
    
    # Verifica se tem keystores
    if [ ! "$(ls -A validator$i/keystore/ 2>/dev/null)" ]; then
        echo "Aviso: Diretório validator$i/keystore/ está vazio ou não existe!"
    fi
done

# Verifica se há processos Geth em execução e encerra se necessário
if pgrep -f geth > /dev/null; then
    echo "Processos Geth em execução. Encerrando-os..."
    pkill -f geth
    sleep 5
fi

# Usa o arquivo de senha específico de cada validador, se existir
echo "Verificando arquivos de senha..."
for i in {1..5}; do
    if [ -f "validator$i/password.txt" ]; then
        echo "Usando arquivo de senha existente para validador $i"
    else
        echo "Criando arquivo de senha padrão para validador $i..."
        mkdir -p "validator$i"
        echo "senha123" > "validator$i/password.txt"
        echo "ATENÇÃO: Foi criado um arquivo de senha padrão para validador $i. Altere para sua senha real!"
    fi
done

# Inicializa os nós com o genesis.json (só precisa fazer uma vez)
for i in {1..5}; do
    echo "Inicializando o validador $i com o genesis.json..."
    geth --datadir validator$i init "$GENESIS_PATH"
done

echo "Todos os validadores foram inicializados com o genesis.json."
echo "Aguarde um momento..."
sleep 2

# Inicia o primeiro validador com mineração explícita
echo "Iniciando validador 1..."
nohup geth --datadir validator1 \
     --networkid 12345 \
     --port 30301 \
     --http \
     --http.addr "0.0.0.0" \
     --http.port 8545 \
     --http.corsdomain "*" \
     --http.api "eth,net,web3,personal,admin,clique,miner" \
     --mine \
     --miner.etherbase "$VALIDATOR1_ADDRESS" \
     --unlock "$VALIDATOR1_ADDRESS" \
     --password "validator1/password.txt" \
     --allow-insecure-unlock \
     --syncmode full \
     --verbosity 4 \
     --authrpc.port 8551 \
     --nat "extip:127.0.0.1" \
     --nodiscover \
     --identity "validator1" \
     > validator1/validator1.log 2>&1 &

VALIDATOR1_PID=$!
echo "Validador 1 iniciado com PID: $VALIDATOR1_PID"

# Aguarda o validador iniciar
echo "Aguardando o validador 1 iniciar..."
sleep 10

# Obtém o enode do primeiro validador
echo "Obtendo enode do validador 1..."
MAX_TRIES=10
TRIES=0
VALIDATOR1_ENODE=""

while [ -z "$VALIDATOR1_ENODE" ] && [ $TRIES -lt $MAX_TRIES ]; do
    # Remover aspas extras e corrigir formato
    VALIDATOR1_ENODE=$(geth --exec "admin.nodeInfo.enode" attach validator1/geth.ipc 2>/dev/null | tr -d '"')
    if [ -z "$VALIDATOR1_ENODE" ]; then
        echo "Tentando novamente obter o enode do validador 1..."
        sleep 5
        TRIES=$((TRIES+1))
    fi
done

if [ -z "$VALIDATOR1_ENODE" ]; then
    echo "Erro: Não foi possível obter o enode do validador 1 após várias tentativas."
    echo "Verifique se o validador 1 está rodando corretamente."
    exit 1
fi

# Força o enode a usar localhost (127.0.0.1) em vez do IP externo
VALIDATOR1_ENODE=$(echo "$VALIDATOR1_ENODE" | sed 's/@[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:/@127.0.0.1:/g')
echo "Enode do validador 1 (modificado para localhost): $VALIDATOR1_ENODE"

# Garante que a mineração está ativa no validador 1
echo "Ativando mineração no validador 1..."
geth --exec "miner.start()" attach validator1/geth.ipc

# Inicia os outros validadores, também com mineração ativa
declare -A PORTS
declare -A HTTP_PORTS
declare -A AUTHRPC_PORTS
declare -A ADDRESSES

PORTS[2]=30302
PORTS[3]=30303
PORTS[4]=30304
PORTS[5]=30305

HTTP_PORTS[2]=8546
HTTP_PORTS[3]=8547
HTTP_PORTS[4]=8548
HTTP_PORTS[5]=8549

AUTHRPC_PORTS[2]=8552
AUTHRPC_PORTS[3]=8553
AUTHRPC_PORTS[4]=8554
AUTHRPC_PORTS[5]=8555

ADDRESSES[2]=$VALIDATOR2_ADDRESS
ADDRESSES[3]=$VALIDATOR3_ADDRESS
ADDRESSES[4]=$VALIDATOR4_ADDRESS
ADDRESSES[5]=$VALIDATOR5_ADDRESS

declare -A PIDS

for i in {2..5}; do
    echo "Iniciando validador $i..."
    nohup geth --datadir validator$i \
         --networkid 12345 \
         --port ${PORTS[$i]} \
         --http \
         --http.addr "0.0.0.0" \
         --http.port ${HTTP_PORTS[$i]} \
         --http.corsdomain "*" \
         --http.api "eth,net,web3,personal,admin,clique,miner" \
         --mine \
         --miner.etherbase "${ADDRESSES[$i]}" \
         --unlock "${ADDRESSES[$i]}" \
         --password "validator$i/password.txt" \
         --allow-insecure-unlock \
         --syncmode full \
         --verbosity 4 \
         --authrpc.port ${AUTHRPC_PORTS[$i]} \
         --nat "extip:127.0.0.1" \
         --nodiscover \
         --identity "validator$i" \
         > validator$i/validator$i.log 2>&1 &

    PIDS[$i]=$!
    echo "Validador $i iniciado com PID: ${PIDS[$i]}"
    sleep 2
done

# Aguarda para que os outros validadores estejam prontos
echo "Aguardando os outros validadores iniciarem..."
sleep 15

# Conecta os validadores entre si manualmente (todos com todos)
echo "Conectando os validadores manualmente (todos com todos)..."
for i in {1..5}; do
  for j in {1..5}; do
    if [ $i -ne $j ]; then
      echo "Conectando validador $i a validador $j..."
      if [ -S "validator$i/geth.ipc" ] && [ -S "validator$j/geth.ipc" ]; then
        # Obter o enode sem aspas extras
        ENODE_J=$(geth --exec "admin.nodeInfo.enode" attach validator$j/geth.ipc 2>/dev/null | tr -d '"')
        if [ ! -z "$ENODE_J" ]; then
          # Força o enode a usar localhost
          ENODE_J=$(echo "$ENODE_J" | sed 's/@[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+:/@127.0.0.1:/g')
          # Adicionar peer sem aspas extras
          RESULT=$(geth --exec "admin.addPeer('$ENODE_J')" attach validator$i/geth.ipc 2>/dev/null)
          echo "  Resultado: $RESULT"
        fi
      fi
    fi
  done
done

# Verifica as conexões
echo "Verificando conexões entre os validadores..."
for i in {1..5}; do
  if [ -S "validator$i/geth.ipc" ]; then
    echo "Validador $i peers:"
    geth --exec "admin.peers.length" attach validator$i/geth.ipc
  else
    echo "Validador $i não está acessível."
  fi
done

# Garante mineração em todos os validadores
echo "Garantindo que a mineração está ativa em todos os validadores..."
for i in {1..5}; do
  if [ -S "validator$i/geth.ipc" ]; then
    echo "Ativando mineração no validador $i..."
    geth --exec "miner.start()" attach validator$i/geth.ipc
    
    # Verifica status da mineração
    MINING_STATUS=$(geth --exec "eth.mining" attach validator$i/geth.ipc)
    echo "  Status de mineração: $MINING_STATUS"
  fi
done

# Aguarda mais um pouco e verifica novamente
echo "Aguardando mais 30 segundos para as conexões e mineração se estabilizarem..."
sleep 30

echo "Verificando conexões novamente após espera..."
for i in {1..5}; do
  if [ -S "validator$i/geth.ipc" ]; then
    echo "Validador $i peers:"
    geth --exec "admin.peers.length" attach validator$i/geth.ipc
  fi
done

echo "Verificando validadores atuais na rede:"
geth --exec "clique.getSigners()" attach validator1/geth.ipc

echo "Verificando número do bloco atual:"
geth --exec "eth.blockNumber" attach validator1/geth.ipc

echo "Rede PoA inicializada com sucesso!"
echo "PIDs dos processos: Validador 1: $VALIDATOR1_PID, Validador 2: ${PIDS[2]}, Validador 3: ${PIDS[3]}, Validador 4: ${PIDS[4]}, Validador 5: ${PIDS[5]}"
echo "Para acompanhar os logs, use: tail -f validator1/validator1.log"
echo ""
echo "IMPORTANTE: Para interromper a rede de forma limpa, use o script stop-validators.sh"

# Verificar se blocos estão sendo minerados
echo "Verificando se os blocos estão sendo minerados..."
BLOCK_BEFORE=$(geth --exec "eth.blockNumber" attach validator1/geth.ipc 2>/dev/null)
echo "Bloco atual: $BLOCK_BEFORE"
echo "Aguardando 20 segundos..."
sleep 20
BLOCK_AFTER=$(geth --exec "eth.blockNumber" attach validator1/geth.ipc 2>/dev/null)
echo "Bloco após espera: $BLOCK_AFTER"

if [ "$BLOCK_AFTER" -gt "$BLOCK_BEFORE" ]; then
  echo "✅ SUCESSO: Blocos estão sendo minerados! A rede PoA está funcionando."
  
  # Verificar qual validador está minerando os blocos
  LAST_BLOCK=$(geth --exec "eth.getBlock(eth.blockNumber)" attach validator1/geth.ipc)
  echo "Informações do último bloco:"
  echo "$LAST_BLOCK" | grep -E "number|miner|timestamp"
else
  echo "⚠️ AVISO: Não foi detectado aumento no número de blocos."
  echo "Verificando logs para identificar problemas..."
  
  # Exibe as últimas 20 linhas de logs de cada validador
  for i in {1..5}; do
    echo "### Últimas linhas do log do validador $i ###"
    tail -n 20 validator$i/validator$i.log
    echo ""
  done
  
  # Reforçar a ativação da mineração em todos os validadores
  echo "Tentando reativar a mineração em todos os validadores..."
  for i in {1..5}; do
    if [ -S "validator$i/geth.ipc" ]; then
      echo "Reativando mineração no validador $i..."
      geth --exec "miner.stop(); miner.start()" attach validator$i/geth.ipc
    fi
  done
  
  echo "Verificando novamente após reativar mineração..."
  sleep 10
  BLOCK_FINAL=$(geth --exec "eth.blockNumber" attach validator1/geth.ipc 2>/dev/null)
  echo "Bloco após reativação: $BLOCK_FINAL"
  
  if [ "$BLOCK_FINAL" -gt "$BLOCK_AFTER" ]; then
    echo "✅ SUCESSO: Blocos começaram a ser minerados após reativação!"
  else
    echo "❌ ERRO: Ainda não há mineração de blocos. Possíveis problemas:"
    echo "  1. Verifique se as contas dos validadores estão corretamente configuradas no genesis.json"
    echo "  2. Verifique se o período de selagem (clique.period) no genesis.json não está muito alto"
    echo "  3. Verifique os logs detalhados para mensagens de erro específicas"
    echo "  4. Tente reiniciar a rede com o comando: ./stop-validators.sh && ./start-validators-mining-fix.sh"
  fi
fi

echo "Para rodar o script que monitora a rede PoA, é necessário executar:"
echo "./monitor-poa-network.sh"
echo "Para rodar o script que exibe os validadores de dos blocos gerados, execute:"
echo "./check-validator.sh"