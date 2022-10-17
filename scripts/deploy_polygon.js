require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const owner = deployer.address; // TODO: Set correct owner for real deployment

  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(process.env.TOKENSWAP, process.env.FX_CHILD, owner);

  console.log("Treasury address:", treasury.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });