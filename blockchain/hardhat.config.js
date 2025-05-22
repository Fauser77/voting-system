require("@nomicfoundation/hardhat-toolbox");
const { POA_PRIVATE_KEYS } = require('./accounts.config');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    // Configuração da rede PoA
    poa: {
      url: "http://127.0.0.1:8545", 
      chainId: 12345, 
      accounts: POA_PRIVATE_KEYS,
      timeout: 60000
    }
  },
  paths: {
    artifacts: "./artifacts",
  },
};