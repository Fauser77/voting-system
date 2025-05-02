require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "smart unaware oblige average guitar comfort charge style angry because approve van",
      },
    },
  },
  paths: {
    artifacts: "./artifacts",
  },
};