import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, NETWORK_CONFIG } from '../utils/constants';
import { BALLOT_ABI } from '../utils/contractABI';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkId, setNetworkId] = useState(null);

  // Conectar ao provider JSON-RPC local
  const connectToLocalNode = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Criar provider customizado para a rede PoA local
      const localProvider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      
      // Verificar conexão
      const network = await localProvider.getNetwork();
      console.log('Conectado à rede:', network);
      
      setProvider(localProvider);
      setNetworkId(network.chainId.toString());

      // Criar instância do contrato
      const ballotContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        BALLOT_ABI,
        localProvider
      );
      
      setContract(ballotContract);
      
    } catch (err) {
      console.error('Erro ao conectar:', err);
      setError('Não foi possível conectar à rede local. Verifique se os validadores estão rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  // Conectar com uma conta específica (usando private key)
  const connectAccount = async (privateKey) => {
    try {
      if (!provider) {
        throw new Error('Provider não disponível');
      }

      // Criar wallet a partir da private key
      const wallet = new ethers.Wallet(privateKey, provider);
      setSigner(wallet);
      setAccount(wallet.address);

      // Atualizar contrato com signer
      const ballotContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        BALLOT_ABI,
        wallet
      );
      
      setContract(ballotContract);
      
      return wallet.address;
    } catch (err) {
      console.error('Erro ao conectar conta:', err);
      throw err;
    }
  };

  // Desconectar conta
  const disconnect = () => {
    setSigner(null);
    setAccount(null);
    
    // Resetar contrato para read-only
    if (provider) {
      const ballotContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        BALLOT_ABI,
        provider
      );
      setContract(ballotContract);
    }
  };

  // Verificar se é o chairperson
  const isChairperson = async (address) => {
    if (!contract) return false;
    try {
      const chairpersonAddress = await contract.chairPerson();
      return chairpersonAddress.toLowerCase() === address.toLowerCase();
    } catch (err) {
      console.error('Erro ao verificar chairperson:', err);
      return false;
    }
  };

  // Efeito inicial para conectar ao nó local
  useEffect(() => {
    connectToLocalNode();
  }, []);

  const value = {
    provider,
    signer,
    account,
    contract,
    isLoading,
    error,
    networkId,
    connectAccount,
    disconnect,
    isChairperson,
    connectToLocalNode,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};