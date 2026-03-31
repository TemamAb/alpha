import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const providerAddress = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb"; // Aave V3 Polygon Mumbai Pool Provider
  const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
  const contract = await FlashLoanArbitrage.deploy(providerAddress);

  await contract.waitForDeployment();
  console.log("Deployed at:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

