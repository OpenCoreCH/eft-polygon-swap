const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployMockContract } = require('ethereum-waffle');
const IFxStateSender = require("../artifacts/contracts/interfaces/IFxStateSender.sol/IFxStateSender.json");
const { VALID_RECEIPT, INVALID_RECEIPT, RECEIPT_RECIPIENT, RECEIPT_ETH_AMOUNT, TREASURY_VALID_RECEIPT, TREASURY_ETH_AMOUNT } = require("./constants");


let GOVERNANCE_FUND, FX_ROOT;
let FX_CHILD_TUNNEL = "0x54fa9a41841C72b11e9c961d17dA04b085EC6D69";
const conversionFactor = 1000;
const CP_MANAGER = "0x2890bA17EfE978480615e330ecB65333b880928e";

describe("TokenSwap contract", function () {
  async function deployTokenFixture() {
    const TokenSwap = await ethers.getContractFactory("TokenSwap");
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const MockErc721 = await ethers.getContractFactory("MockERC721");
    const mockErc721 = await MockErc721.deploy();

    GOVERNANCE_FUND = addr2;
    FX_ROOT = await deployMockContract(owner, IFxStateSender.abi);

    const tokenSwap = await TokenSwap.deploy(CP_MANAGER, FX_ROOT.address, GOVERNANCE_FUND.address, mockErc721.address, owner.address);
    await tokenSwap.setFxChildTunnel(FX_CHILD_TUNNEL);
    await tokenSwap.deployed();

    return { tokenSwap, owner, addr1, addr2, mockErc721 };
  }

  describe("Convert ETH to EFT", function () {
    it("Should revert for no ETH", async function () {
      const { tokenSwap } = await loadFixture(deployTokenFixture);
      await expect(tokenSwap.convertETHtoEFT()).to.be.revertedWith("Must send ETH");
    });

    it("Should send ETH to governance fund and EFT to Polygon", async function () {
      const { tokenSwap, owner } = await loadFixture(deployTokenFixture);
      const amount = 1000;
      await FX_ROOT.mock.sendMessageToChild.returns();
      await expect(tokenSwap.convertETHtoEFT({ value: amount })).to.changeEtherBalances([owner, GOVERNANCE_FUND], [-amount, amount]);
    });
  });

  describe("Treasury Deposits", function () {
    it("Should revert for no ETH", async function () {
      const { tokenSwap } = await loadFixture(deployTokenFixture);
      await expect(tokenSwap.convertETHtoEFT()).to.be.revertedWith("Must send ETH");
    });

    it("Should send ETH to governance fund and EFT to Polygon", async function () {
      const { tokenSwap, owner } = await loadFixture(deployTokenFixture);
      const amount = 1000;
      await FX_ROOT.mock.sendMessageToChild.returns();
      await expect(tokenSwap.depositTreasury({ value: amount })).to.changeEtherBalances([owner, GOVERNANCE_FUND], [-amount, amount]);
    });
  });

  describe("Withdraw", function () {
    it("Valid receipt should verify and transfer ether for non-member", async function () {
      const { tokenSwap } = await loadFixture(deployTokenFixture);
      await GOVERNANCE_FUND.sendTransaction({
        to: tokenSwap.address,
        value: RECEIPT_ETH_AMOUNT
      });
      const RECIPIENT = await ethers.getImpersonatedSigner(RECEIPT_RECIPIENT);
      const feeAmount = RECEIPT_ETH_AMOUNT.mul(30).div(1000);
      const netAmount = RECEIPT_ETH_AMOUNT.sub(feeAmount);
      await expect(tokenSwap.receiveMessage(VALID_RECEIPT)).to.changeEtherBalances([RECIPIENT, GOVERNANCE_FUND], [netAmount, feeAmount]);
    });

    it("Valid receipt should verify and transfer ether for member", async function () {
      const { tokenSwap, mockErc721 } = await loadFixture(deployTokenFixture);
      await GOVERNANCE_FUND.sendTransaction({
        to: tokenSwap.address,
        value: RECEIPT_ETH_AMOUNT
      });
      await mockErc721.mint(RECEIPT_RECIPIENT);
      const RECIPIENT = await ethers.getImpersonatedSigner(RECEIPT_RECIPIENT);
      await expect(tokenSwap.receiveMessage(VALID_RECEIPT)).to.changeEtherBalances([RECIPIENT, GOVERNANCE_FUND], [RECEIPT_ETH_AMOUNT, 0]);
    });

    it("withdrawTreasury should result in transfer to governance fund without fees", async function () {
      const { tokenSwap } = await loadFixture(deployTokenFixture);
      await GOVERNANCE_FUND.sendTransaction({
        to: tokenSwap.address,
        value: TREASURY_ETH_AMOUNT
      });
      await expect(tokenSwap.receiveMessage(TREASURY_VALID_RECEIPT)).to.changeEtherBalance(GOVERNANCE_FUND, TREASURY_ETH_AMOUNT);
    });

    it("Withdraw should fail without ether", async function () {
      const { tokenSwap } = await loadFixture(deployTokenFixture);
      await expect(tokenSwap.receiveMessage(VALID_RECEIPT)).to.be.revertedWithoutReason();
    });

    it("Withdrawing multiple times should fail", async function () {
      const { tokenSwap } = await loadFixture(deployTokenFixture);
      await GOVERNANCE_FUND.sendTransaction({
        to: tokenSwap.address,
        value: RECEIPT_ETH_AMOUNT.mul(2)
      });
      await tokenSwap.receiveMessage(VALID_RECEIPT);
      await expect(tokenSwap.receiveMessage(VALID_RECEIPT)).to.be.revertedWith("FxRootTunnel: EXIT_ALREADY_PROCESSED");
    });

    it("Withdraw should fail when message came from wrong child", async function () {
      const [owner, addr1, addr2, addr3] = await ethers.getSigners();
      FX_CHILD_TUNNEL = addr1.address;
      const TokenSwap = await ethers.getContractFactory("TokenSwap");

      GOVERNANCE_FUND = addr2;
      FX_ROOT = await deployMockContract(owner, IFxStateSender.abi);
      const MockErc721 = await ethers.getContractFactory("MockERC721");
      const mockErc721 = await MockErc721.deploy();

      const tokenSwap = await TokenSwap.deploy(CP_MANAGER, FX_ROOT.address, GOVERNANCE_FUND.address, mockErc721.address, owner.address);
      await tokenSwap.setFxChildTunnel(FX_CHILD_TUNNEL);
      await tokenSwap.deployed();


      await expect(tokenSwap.receiveMessage(VALID_RECEIPT)).to.be.revertedWith("FxRootTunnel: INVALID_FX_CHILD_TUNNEL");
    });

    it("Withdrawing with invalid receipt should fail", async function () {
      const { tokenSwap } = await loadFixture(deployTokenFixture);
      const INVALID_RECEIPT = VALID_RECEIPT.replace("a", "b");
      await expect(tokenSwap.receiveMessage(INVALID_RECEIPT)).to.be.revertedWith("FxRootTunnel: INVALID_HEADER");
    });

  });

});