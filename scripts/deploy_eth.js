require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  const governanceFund = deployer.address; // TODO: Change to real governance fund
  const memberNFT = "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d"; // TODO: Change to real NFT...
  const owner = deployer.address; // TOD: Change to real owner

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const TokenSwap = await ethers.getContractFactory("TokenSwap");
  const tokenSwap = await TokenSwap.deploy(process.env.CP_MANAGER, process.env.FX_ROOT, governanceFund, memberNFT, owner);

  console.log("TokenSwap address:", tokenSwap.address);
  // Need to call setFxChildTunnel with address of Treasury after Polygon deployment.
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });