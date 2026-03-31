import { expect } from "chai";
import { ethers } from "hardhat";
import { anyUint } from "ethers";

describe("FlashLoanArbitrage", function () {
  let contract: any;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const providerAddress = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    contract = await FlashLoanArbitrage.deploy(providerAddress);
    await contract.waitForDeployment();
  });

  it("Should deploy correctly", async function () {
    expect(await contract.owner()).to.equal(owner.address);
  });

  // Mock arb test would require fork or mocks
  it("Should allow owner to initiate flash loan", async function () {
    // Full test needs Aave fork: npx hardhat node --fork POLYGON_RPC
    const tx = await contract.startFlashLoan(anyUint, ethers.parseUnits("1", 6));
    await expect(tx).to.emit(contract, "someEvent"); // Adjust
  });
});

