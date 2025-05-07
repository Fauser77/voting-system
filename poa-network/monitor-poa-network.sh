#!/bin/bash
# Script para monitorar a rede PoA

echo "=== Monitoramento da Rede PoA ==="
echo "Data e hora: $(date)"
echo ""

# Verificar status dos validadores
for i in {1..5}; do
  if [ -S "validator$i/geth.ipc" ]; then
    echo "=== Validador $i ==="
    echo "Status de conexão: ✅ Online"
    
    # Número de peers
    PEERS=$(geth --exec "admin.peers.length" attach validator$i/geth.ipc 2>/dev/null)
    echo "Número de peers: $PEERS"
    
    # Número do bloco
    BLOCK=$(geth --exec "eth.blockNumber" attach validator$i/geth.ipc 2>/dev/null)
    echo "Bloco atual: $BLOCK"
    
    # Status de mineração
    MINING=$(geth --exec "eth.mining" attach validator$i/geth.ipc 2>/dev/null)
    echo "Mineração ativa: $MINING"
    
    # Saldo da conta
    ADDR=$(geth --exec "eth.coinbase" attach validator$i/geth.ipc 2>/dev/null)
    BALANCE=$(geth --exec "web3.fromWei(eth.getBalance(eth.coinbase), 'ether')" attach validator$i/geth.ipc 2>/dev/null)
    echo "Endereço: $ADDR"
    echo "Saldo: $BALANCE ETH"
    
    echo ""
  else
    echo "=== Validador $i ==="
    echo "Status de conexão: ❌ Offline"
    echo ""
  fi
done

echo "=== Informações da Rede ==="
if [ -S "validator1/geth.ipc" ]; then
  # Lista de validadores
  echo "Validadores ativos:"
  SIGNERS=$(geth --exec "clique.getSigners()" attach validator1/geth.ipc 2>/dev/null)
  echo "$SIGNERS"
  
  # Último bloco
  echo ""
  echo "Informações do último bloco:"
  LAST_BLOCK=$(geth --exec "eth.getBlock(eth.blockNumber)" attach validator1/geth.ipc 2>/dev/null)
  echo "$LAST_BLOCK" | grep -E "number|hash|miner|timestamp|gasUsed"
  
  # Calcular TPS (transações por segundo)
  echo ""
  echo "Calculando taxa de blocos..."
  BLOCK_NOW=$(geth --exec "eth.blockNumber" attach validator1/geth.ipc 2>/dev/null)
  echo "Bloco atual: $BLOCK_NOW"
  echo "Aguardando 10 segundos..."
  sleep 10
  BLOCK_AFTER=$(geth --exec "eth.blockNumber" attach validator1/geth.ipc 2>/dev/null)
  echo "Bloco após 10s: $BLOCK_AFTER"
  
  BLOCKS_MINED=$((BLOCK_AFTER - BLOCK_NOW))
  BPS=$(echo "scale=2; $BLOCKS_MINED / 10" | bc)
  
  echo "Taxa de produção de blocos: $BPS blocos/segundo"
  
  if [ $BLOCKS_MINED -gt 0 ]; then
    echo "✅ Rede está produzindo blocos normalmente"
  else
    echo "⚠️ Nenhum bloco produzido nos últimos 10 segundos!"
  fi
else
  echo "❌ Não foi possível conectar-se à rede. Verifique se os validadores estão em execução."
fi

echo ""
echo "=== Fim do Monitoramento ==="
