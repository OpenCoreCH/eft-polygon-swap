// source code: https://maticnetwork.github.io/matic.js/docs/advanced/exit-util/
import MaticJs from "@maticnetwork/maticjs";
import MaticJsWeb3 from "@maticnetwork/maticjs-web3";
import 'dotenv/config';

MaticJs.use(MaticJsWeb3.Web3ClientPlugin);

const posClient = new MaticJs.POSClient();
await posClient.init({
  network: 'testnet',
  version: 'mumbai',
  parent: {
    provider: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_GOERLI_KEY}`,
  },
  child: {
    provider: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_MUMBAI_KEY}`,
  }
});

const txnHash = "0x9375241e7cb9e004b4f527b319dd657c76733e32adde44b0eff083178c959d74"; // Replace with hash of withdrawal transaction

const proof = await posClient.exitUtil.buildPayloadForExit(
  txnHash,
  "0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036", // SEND_MESSAGE_EVENT_SIG do not change,
  false
)
console.log(proof);