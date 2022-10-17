const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployMockContract } = require('ethereum-waffle');
const IFxStateSender = require("../artifacts/contracts/interfaces/IFxStateSender.sol/IFxStateSender.json");
const { VALID_RECEIPT, INVALID_RECEIPT, RECEIPT_RECIPIENT, RECEIPT_ETH_AMOUNT } = require("./constants");


let ROOT_PARENT, FX_CHILD;
const conversionFactor = 1000;

describe("Treasury and EFT contract", function () {
  async function deployTreasuryFixture() {
    const Treasury = await ethers.getContractFactory("Treasury");
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    ROOT_PARENT = addr2;
    FX_CHILD = addr3;

    const treasury = await Treasury.deploy(ROOT_PARENT.address, FX_CHILD.address, owner.address);
    await treasury.deployed();
    const EFT = await ethers.getContractFactory("EFT");
    const eft = await EFT.attach(await treasury.eft());

    return { treasury, eft, owner, addr1, addr2, Treasury };
  }

  describe("EFT Token", function () {
    it("Should have correct decimals", async function () {
      const { eft } = await loadFixture(deployTreasuryFixture);
      expect(await eft.decimals()).to.be.equal(18);
    });

    it("Should have correct name", async function () {
      const { eft } = await loadFixture(deployTreasuryFixture);
      expect(await eft.name()).to.be.equal("EFT");
    });

    it("Should have correct symbol", async function () {
      const { eft } = await loadFixture(deployTreasuryFixture);
      expect(await eft.symbol()).to.be.equal("EFT");
    });

    it("Should have no initial supply", async function () {
      const { eft } = await loadFixture(deployTreasuryFixture);
      expect(await eft.totalSupply()).to.be.equal(0);
    });

    it("Should have treasury as owner", async function () {
      const { treasury, eft } = await loadFixture(deployTreasuryFixture);
      expect(await eft.owner()).to.be.equal(treasury.address);
    });

    it("Users should not be able to mint", async function () {
      const { eft, owner } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      await expect(eft.mint(owner.address, amount)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Users should not be able to burn", async function () {
      const { eft, owner } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      await expect(eft.burn(owner.address, amount)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Treasury", function () {
    it("mintForUser Crosschain from root should work", async function () {
      const { eft, addr1, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("mintForUser", [addr1.address, amount]);
      await treasury.connect(FX_CHILD).processMessageFromRoot(0, ROOT_PARENT.address, data);
      expect(await eft.totalSupply()).to.be.equal(amount);
      expect(await eft.balanceOf(addr1.address)).to.be.equal(amount);
    });

    it("addToTreasury Crosschain from root should work", async function () {
      const { eft, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("addToTreasury", [amount]);
      await treasury.connect(FX_CHILD).processMessageFromRoot(0, ROOT_PARENT.address, data);
      expect(await eft.totalSupply()).to.be.equal(amount);
      expect(await eft.balanceOf(treasury.address)).to.be.equal(amount);
    });

    it("mintForUser direct call should fail", async function () {
      const { addr1, treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      await expect(treasury.mintForUser(addr1.address, amount)).to.be.reverted;
    });

    it("addToTreasury direct call should fail", async function () {
      const { treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      await expect(treasury.addToTreasury(amount)).to.be.reverted;
    });

    it("Crosschain call from wrong root should fail", async function () {
      const { owner, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("addToTreasury", [amount]);
      await expect(treasury.connect(FX_CHILD).processMessageFromRoot(0, owner.address, data)).to.be.reverted;
    });

    it("Crosschain call from wrong child should fail", async function () {
      const { owner, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.connect(owner).interface.encodeFunctionData("addToTreasury", [amount]);
      await expect(treasury.processMessageFromRoot(0, ROOT_PARENT.address, data)).to.be.reverted;
    });

    it("Withdrawing without balance should fail", async function () {
      const { treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      await expect(treasury.withdraw(amount)).to.be.revertedWith("Insufficient funds");
    });

    it("Withdrawing some balance should succeed", async function () {
      const { eft, addr1, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("mintForUser", [addr1.address, amount]);
      await treasury.connect(FX_CHILD).processMessageFromRoot(0, ROOT_PARENT.address, data);
      const expectedMessage = ethers.utils.solidityPack(["uint256", "uint256"], [addr1.address, amount / 2]);
      await expect(treasury.connect(addr1).withdraw(amount / 2)).to.emit(treasury, "MessageSent").withArgs(expectedMessage);
      expect(await eft.balanceOf(addr1.address)).to.be.equal(amount - amount / 2);
    });

    it("Withdrawing whole balance should succeed", async function () {
      const { eft, addr1, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("mintForUser", [addr1.address, amount]);
      await treasury.connect(FX_CHILD).processMessageFromRoot(0, ROOT_PARENT.address, data);
      const expectedMessage = ethers.utils.solidityPack(["uint256", "uint256"], [addr1.address, amount]);
      await expect(treasury.connect(addr1).withdraw(amount)).to.emit(treasury, "MessageSent").withArgs(expectedMessage);
      expect(await eft.balanceOf(addr1.address)).to.be.equal(0);
    });

    it("Withdrawing too much should fail", async function () {
      const { addr1, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("mintForUser", [addr1.address, amount]);
      await treasury.connect(FX_CHILD).processMessageFromRoot(0, ROOT_PARENT.address, data);
      await expect(treasury.connect(addr1).withdraw(amount + 1)).to.be.revertedWith("Insufficient funds");
    });

    it("withdrawFromTreasury not callable by non-owner", async function () {
      const { addr1, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("addToTreasury", [amount]);
      await treasury.connect(FX_CHILD).processMessageFromRoot(0, ROOT_PARENT.address, data);
      await expect(treasury.connect(addr1).withdrawFromTreasury(amount)).to.be.reverted;
    });

    it("withdrawFromTreasury with too high amount should fail", async function () {
      const { owner, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("addToTreasury", [amount]);
      await treasury.connect(FX_CHILD).processMessageFromRoot(0, ROOT_PARENT.address, data);
      await expect(treasury.connect(owner).withdrawFromTreasury(amount + 1)).to.be.revertedWith("Insufficient funds");
    });

    it("withdrawFromTreasury from owner should succeed", async function () {
      const { owner, treasury, Treasury } = await loadFixture(deployTreasuryFixture);
      const amount = 1000;
      const data = Treasury.interface.encodeFunctionData("addToTreasury", [amount]);
      await treasury.connect(FX_CHILD).processMessageFromRoot(0, ROOT_PARENT.address, data);
      const expectedMessage = ethers.utils.solidityPack(["uint256", "uint256"], [0, amount]);
      await expect(treasury.connect(owner).withdrawFromTreasury(amount)).to.emit(treasury, "MessageSent").withArgs(expectedMessage);
    });
  });

});