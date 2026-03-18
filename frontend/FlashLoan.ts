import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashLoan", function () {
  it("Should have the correct owner", async function () {
    const [owner] = await ethers.getSigners();
    const FlashLoan = await ethers.getContractFactory("FlashLoan");
    // The Aave V3 PoolAddressesProvider address on Sepolia.
    // This is used as a placeholder for the lending pool address in the constructor.
    const lendingPoolAddress = "0x2f39d218d388dC8220B07321A491634Ad94E9e";
    const flashLoan = await FlashLoan.deploy(lendingPoolAddress);
    await flashLoan.deployed();

    expect(await flashLoan.owner()).to.equal(owner.address);
  });
});