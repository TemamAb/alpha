const hre = require("hardhat");

async function main() {
  // Aave V3 Pool addresses (forked from mainnet/local)
  const POOL_ADDRESSES = {
    localethereum: "0x87870Bca3F3fD6335C3F4c8392D7A5D3f4c4C5E",  // Aave V3 Eth
    localpolygon: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Aave V3 Polygon  
    localbsc: "0x4F628a66Db8a0537D7147bC8Db7d8EA1F5Aa6f6"   // Aave-like BSC
  };

  const networkName = hre.network.name;
  const poolAddress = POOL_ADDRESSES[networkName] || "0x87870Bca3F3fD6335C3F4c8392D7A5D3f4c4C5E";

  console.log(`\n🚀 Deploying FlashLoan to ${networkName}`);
  console.log(`📡 Aave Pool: ${poolAddress}`);

  // Deploy FlashLoan contract
  const FlashLoan = await hre.ethers.getContractFactory("FlashLoan");
  const flashLoan = await FlashLoan.deploy(poolAddress);

  await flashLoan.waitForDeployment();

  const address = await flashLoan.getAddress();
  
  console.log("\n✅ FlashLoan deployed to:", address);
  console.log(`\n💡 Update .env: FLASHLOAN_CONTRACT_ADDRESS=${address}`);
  console.log(`\n📍 Update contracts.json → "flashloan_address": "${address}"`);

  // Verify (if Etherscan API configured)
  if (hre.network.config.chainId !== 31337 && hre.network.config.chainId !== 1337) {
    console.log("\n🔍 Verifying on block explorer...");
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [poolAddress],
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

