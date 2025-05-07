#!/bin/bash
# Script para parar os validadores de forma limpa

echo "Parando os validadores de forma limpa..."

for i in {1..5}; do
  if [ -S "validator$i/geth.ipc" ]; then
    echo "Parando validador $i graciosamente..."
    # Parar mineração e serviços RPC sem usar exit()
    geth --exec "miner.stop(); admin.stopRPC(); admin.stopWS()" attach validator$i/geth.ipc 2>/dev/null
    
    # Parar o nó de forma elegante usando admin.quit()
    geth --exec "admin.quit()" attach validator$i/geth.ipc 2>/dev/null || true
    sleep 2
  fi
done

# Esperar um pouco
sleep 5

# Verificar se algum processo ainda está rodando
if pgrep -f geth > /dev/null; then
  echo "Alguns processos geth ainda estão rodando. Forçando encerramento..."
  pkill -f geth
  sleep 2
fi

# Verificação final
if pgrep -f geth > /dev/null; then
  echo "Alguns processos geth ainda persistem. Usando SIGKILL para encerrar..."
  pkill -9 -f geth
  sleep 1
fi

# Confirmar que todos os processos foram encerrados
if ! pgrep -f geth > /dev/null; then
  echo "Todos os validadores foram parados com sucesso."
else
  echo "AVISO: Ainda existem processos geth em execução. Verifique manualmente com 'ps aux | grep geth'."
fi