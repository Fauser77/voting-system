require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    // Manter a configuração do Ganache para testes locais
    ganache: {
      url: "http://127.0.0.1:8545",
      accounts: {
        mnemonic: "smart unaware oblige average guitar comfort charge style angry because approve van",
      },
    },
    // Configuração da rede PoA
    poa: {
      url: "http://127.0.0.1:8545", // Endereço do primeiro validador
      chainId: 12345, // Deve corresponder ao chainId no genesis.json
      accounts: [
        // Chaves privadas das contas de eleitores SEM o prefixo 0x
        "4b303ac43aaaee7491caebd674f22356343b7fbfa936e3b313564fc4132ef744",
        "e4e79abf49209e47d9082c5544600c83fc0a9249394bdf9d691491f7723f9a4c",
        "5e26ea4b4c4c07b8b66b9a137c396b5f316b1cf4d906fda1413466f2ad196985",
        "9af8053caa96a0b4391e03530d6e7896fbca032869be4caf304f3164604ee9bb",
        "062860eca5db48e22d3dbccc85f698f5c052d17379176e16300a3a937fa27813"
      ],
      timeout: 60000 // Timeout maior para redes mais lentas
    }
  },
  paths: {
    artifacts: "./artifacts",
  },
};