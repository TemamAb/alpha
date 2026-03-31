const hre = require("hardhat");

async function main() {
  const networkName = hre.network.name;
  const { ethers } = hre;
  
  console.log(`\n🔍 Fetching signers for ${networkName}...`);
  
  // Explicitly check for signers to prevent "ENS resolution" errors
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  if (!deployer) {
    throw new Error("❌ No signer available! Check your hardhat.config.js accounts or .env file.");
  }

  // For standalone arbitrage, we use treasury address
  // Profits should go to the configured treasury or the deployer by default
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;

  console.log(`\n🚀 Deploying FlashLoan to ${networkName}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`📜 Treasury: ${TREASURY_ADDRESS}`);

  // Deploy FlashLoan contract with treasury address
  const FlashLoan = await hre.ethers.getContractFactory("FlashLoan");
  const flashLoan = await FlashLoan.deploy(TREASURY_ADDRESS);

  await flashLoan.waitForDeployment();

  const address = await flashLoan.getAddress();
  
  console.log("\n✅ FlashLoan deployed to:", address);
  // Machine-readable output for automation scripts
  console.log(`RESULT:FLASHLOAN_CONTRACT_ADDRESS=${address}`);
  console.log(`\n💡 Update .env: FLASHLOAN_CONTRACT_ADDRESS=${address}`);
  console.log(`\n📍 Update contracts.json → "flashloan_address": "${address}"`);

  // Verify (if Etherscan API configured)
  if (hre.network.config.chainId !== 31337 && hre.network.config.chainId !== 1337) {
    console.log("\n🔍 Verifying on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [TREASURY_ADDRESS],
      });
    } catch (e) {
      console.log("⚠️ Verification skipped or failed, but address is saved.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
