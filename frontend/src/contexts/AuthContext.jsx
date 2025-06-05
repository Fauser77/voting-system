import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import { USER_TYPES } from '../utils/constants';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { account, isChairperson, contract } = useWeb3();
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(USER_TYPES.GUEST);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [voterInfo, setVoterInfo] = useState(null);

  // Atualizar informações do usuário quando a conta mudar
  useEffect(() => {
    const updateUserInfo = async () => {
      if (account && contract) {
        try {
          // Verificar se é chairperson
          const isChair = await isChairperson(account);
          
          if (isChair) {
            setUserType(USER_TYPES.CHAIRPERSON);
          } else {
            setUserType(USER_TYPES.VOTER);
            
            // Buscar informações do eleitor
            const info = await contract.voters(account);
            setVoterInfo({
              hasRightToVote: info.hasRightToVote,
              hasVoted: info.isVoted,
              vote: info.vote,
              address: account
            });
          }
          
          setUser({
            address: account,
            type: isChair ? USER_TYPES.CHAIRPERSON : USER_TYPES.VOTER
          });
          
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Erro ao buscar informações do usuário:', error);
          setUserType(USER_TYPES.GUEST);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setUserType(USER_TYPES.GUEST);
        setIsAuthenticated(false);
        setVoterInfo(null);
      }
    };

    updateUserInfo();
  }, [account, contract, isChairperson]);

  const value = {
    user,
    userType,
    isAuthenticated,
    voterInfo,
    isChairperson: userType === USER_TYPES.CHAIRPERSON,
    isVoter: userType === USER_TYPES.VOTER,
    refreshVoterInfo: async () => {
      if (account && contract && userType === USER_TYPES.VOTER) {
        try {
          const info = await contract.voters(account);
          setVoterInfo({
            hasRightToVote: info.hasRightToVote,
            hasVoted: info.isVoted,
            vote: info.vote,
            address: account
          });
        } catch (error) {
          console.error('Erro ao atualizar informações do eleitor:', error);
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};