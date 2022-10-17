/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_GOERLI_KEY;
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY;
const MUMBAI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      },
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [GOERLI_PRIVATE_KEY]
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [MUMBAI_PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.POLYSCAN_API_KEY,
    // apiKey: process.env.ETHERSCAN_API_KEY,
  }
};
