import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("ArbitrageExecutor", function () {
    let ArbitrageExecutor: ContractFactory;
    let arbitrageExecutor: Contract;
    let owner: SignerWithAddress;
    let otherAccount: SignerWithAddress;
  let ArbitrageExecutor: ContractFactory;
  let arbitrageExecutor: Contract;
  let owner: SignerWithAddress;
  let otherAccount: SignerWithAddress;

    // Using the real Sepolia V3 PoolAddressesProvider address from the contract
    const AAVE_POOL_ADDRESS_PROVIDER = "0x2f39d218d388dC8220B07321A491634Ad94E9e";
  // Using the real Sepolia V3 PoolAddressesProvider address from the contract
  const AAVE_POOL_ADDRESS_PROVIDER = "0x2f39d218d388dC8220B07321A491634Ad94E9e";

    beforeEach(async function () {
        [owner, otherAccount] = await ethers.getSigners();
        ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
        arbitrageExecutor = await ArbitrageExecutor.deploy();
        await arbitrageExecutor.deployed();
  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
    arbitrageExecutor = await ArbitrageExecutor.deploy();
    await arbitrageExecutor.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await arbitrageExecutor.owner()).to.equal(owner.address);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await arbitrageExecutor.owner()).to.equal(owner.address);
        });

        it("Should set the correct Aave Pool address provider", async function () {
            // The POOL variable in the contract is an IPool interface instance.
            // We can check its address.
            const poolAddress = await arbitrageExecutor.POOL();
            expect(poolAddress).to.equal(AAVE_POOL_ADDRESS_PROVIDER);
        });
    it("Should set the correct Aave Pool address provider", async function () {
      // The POOL variable in the contract is an IPool interface instance.
      // We can check its address.
      const poolAddress = await arbitrageExecutor.POOL();
      expect(poolAddress).to.equal(AAVE_POOL_ADDRESS_PROVIDER);
    });
  });

    describe("Access Control", function () {
        it("Should prevent non-owners from starting an arbitrage", async function () {
            const mockTokenAddress = "0x" + "1".repeat(40); // Mock address
            const loanAmount = ethers.utils.parseEther("10");
            const tradeData = "0x"; // Empty data for this test
  describe("Access Control", function () {
    it("Should prevent non-owners from starting an arbitrage", async function () {
      const mockTokenAddress = "0x" + "1".repeat(40); // Mock address
      const loanAmount = ethers.utils.parseEther("10");
      const tradeData = "0x"; // Empty data for this test

            await expect(
                arbitrageExecutor
                    .connect(otherAccount)
                    .startArbitrage(mockTokenAddress, loanAmount, tradeData)
            ).to.be.revertedWith("AO: Caller is not the owner");
        });
      await expect(
        arbitrageExecutor
          .connect(otherAccount)
          .startArbitrage(mockTokenAddress, loanAmount, tradeData)
      ).to.be.revertedWith("AO: Caller is not the owner");
    });
  });

    describe("Flash Loan Execution", function () {
        it("Should revert if executeOperation is called by an address other than the Aave Pool", async function () {
            const mockTokenAddress = "0x" + "1".repeat(40);
            const amount = ethers.utils.parseEther("10");
            const premium = ethers.utils.parseEther("0.05");
  describe("Flash Loan Execution", function () {
    it("Should revert if executeOperation is called by an address other than the Aave Pool", async function () {
      const mockTokenAddress = "0x" + "1".repeat(40);
      const amount = ethers.utils.parseEther("10");
      const premium = ethers.utils.parseEther("0.05");

            // Attempt to call from a random account (not the Aave Pool)
            await expect(
                arbitrageExecutor
                    .connect(otherAccount)
                    .executeOperation(
      // Attempt to call from a random account (not the Aave Pool)
      await expect(
        arbitrageExecutor
          .connect(otherAccount)
          .executeOperation(
                        mockTokenAddress,
                        amount,
                        premium,
                        arbitrageExecutor.address,
                        "0x"
                    )
            ).to.be.revertedWith("AO: Caller is not the Aave Pool");
        });
      ).to.be.revertedWith("AO: Caller is not the Aave Pool");
    });

        it("Should revert if the initiator is not the contract itself", async function () {
            const mockPoolSigner = await ethers.getImpersonatedSigner(AAVE_POOL_ADDRESS_PROVIDER);
            const mockTokenAddress = "0x" + "1".repeat(40);
            const amount = ethers.utils.parseEther("10");
            const premium = ethers.utils.parseEther("0.05");
    it("Should revert if the initiator is not the contract itself", async function () {
      const mockPoolSigner = await ethers.getImpersonatedSigner(AAVE_POOL_ADDRESS_PROVIDER);
      const mockTokenAddress = "0x" + "1".repeat(40);
      const amount = ethers.utils.parseEther("10");
      const premium = ethers.utils.parseEther("0.05");

            // The initiator is some other address, not our contract
            const wrongInitiator = otherAccount.address;
      // The initiator is some other address, not our contract
      const wrongInitiator = otherAccount.address;

            await expect(arbitrageExecutor.connect(mockPoolSigner).executeOperation(mockTokenAddress, amount, premium, wrongInitiator, "0x")).to.be.revertedWith("AO: Initiator is not this contract");
        });
      await expect(arbitrageExecutor.connect(mockPoolSigner).executeOperation(mockTokenAddress, amount, premium, wrongInitiator, "0x")).to.be.revertedWith("AO: Initiator is not this contract");
    });
  });
});