require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "ivory adult flame culture column blade cook draw canyon connect release tennis",
      },
    },
  },
  paths: {
    artifacts: "./artifacts",
  },
};