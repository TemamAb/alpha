// scripts/deploy-flashloan.js

const hre = require("hardhat");

async function main() {
  // Aave V3 Pool address for Ethereum mainnet
  const AAVE_V3_POOL = "0x7BeA39867e4169dBe237d55C8242a8f2fcDcc387";

  const FlashLoan = await hre.ethers.getContractFactory("FlashLoan");
  const flashLoan = await FlashLoan.deploy(AAVE_V3_POOL);

  await flashLoan.deployed();

  console.log("FlashLoan deployed to:", flashLoan.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
