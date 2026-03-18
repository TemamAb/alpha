// Deployment script for Alpha-Orion Flash Loan Arbitrage Contract
// Run with: npx hardhat run scripts/deploy.js --network mainnet

const hre = require("hardhat");

async function main() {
  console.log("Deploying Alpha-Orion Flash Loan Arbitrage Contract...");
  
  // Get Pimlico paymaster address (use for gasless transactions)
  // For mainnet: 0x0000000000000000000000000000000000000000 (needs to be configured)
  const paymaster = process.env.PIMLICO_PAYMASTER_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  // Fee recipient (where protocol fees go)
  const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  // Deploy FlashLoanArbitrage contract
  const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
  const contract = await FlashLoanArbitrage.deploy(paymaster, feeRecipient);
  
  await contract.deployed();
  
  console.log("FlashLoanArbitrage deployed to:", contract.address);
  console.log("Paymaster:", paymaster);
  console.log("Fee Recipient:", feeRecipient);
  
  // Verify contract on Etherscan
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: [paymaster, feeRecipient],
    });
    console.log("Contract verified!");
  }
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: contract.address,
    paymaster: paymaster,
    feeRecipient: feeRecipient,
    network: hre.network.name,
    timestamp: new Date().toISOString(),
  };
  
  const fs = require("fs");
  fs.writeFileSync(
    `deployments/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment saved to deployments/" + hre.network.name + ".json");
  return contract.address;
}

main()
  .then((address) => {
    console.log("Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
