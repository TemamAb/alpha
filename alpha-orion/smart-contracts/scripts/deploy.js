// Deployment script for Alpha-Orion Flash Loan Arbitrage Contract
// Run with: npx hardhat run scripts/deploy.js --network mainnet

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying Alpha-Orion Flash Loan Arbitrage Contract...");
  
  const network = hre.network.name;
  const chainId = hre.network.config.chainId || 1;
  
  // Get Pimlico paymaster address
  const paymaster = process.env.PIMLICO_PAYMASTER_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  // Fee recipient
  const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || "0x0000000000000000000000000000000000000000";
  
  console.log(`Network: ${network} (Chain ID: ${chainId})`);
  console.log(`Paymaster: ${paymaster}`);
  console.log(`Fee Recipient: ${feeRecipient}`);
  
  // Deploy FlashLoanArbitrage contract
  const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
  const contract = await FlashLoanArbitrage.deploy(paymaster, feeRecipient);
  
  const deploymentTx = await contract.deploymentTransaction();
  const txReceipt = await deploymentTx.wait();
  
  console.log("FlashLoanArbitrage deployed to:", await contract.getAddress());
  console.log("Transaction hash:", deploymentTx.hash);
  console.log("Block number:", txReceipt.blockNumber);
  console.log("Gas used:", txReceipt.gasUsed.toString());
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: await contract.getAddress(),
    paymaster: paymaster,
    feeRecipient: feeRecipient,
    network: network,
    chainId: chainId,
    txHash: deploymentTx.hash,
    blockNumber: txReceipt.blockNumber,
    gasUsed: txReceipt.gasUsed.toString(),
    deployedAt: new Date().toISOString(),
    constructorArguments: [paymaster, feeRecipient]
  };
  
  // Create deployments directory if not exists
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save network-specific deployment
  const deploymentFile = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to: ${deploymentFile}`);
  
  // Verify contract on Etherscan (if API key provided and on mainnet/testnet)
  if (process.env.ETHERSCAN_API_KEY && (network === "mainnet" || network === "sepolia")) {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: await contract.getAddress(),
        constructorArguments: [paymaster, feeRecipient],
      });
      console.log("Contract verified on Etherscan!");
      deploymentInfo.verified = true;
      deploymentInfo.verifiedAt = new Date().toISOString();
      
      // Update deployment file with verification info
      fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    } catch (error) {
      console.log("Verification skipped:", error.message);
      deploymentInfo.verified = false;
      deploymentInfo.verificationError = error.message;
    }
  }
  
  // Update main DEPLOYMENT_REGISTRY.json
  try {
    const registryPath = path.join(__dirname, "..", "..", "..", "DEPLOYMENT_REGISTRY.json");
    if (fs.existsSync(registryPath)) {
      const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
      
      if (registry.environments[network === "mainnet" ? "production" : "staging"]) {
        const env = registry.environments[network === "mainnet" ? "production" : "staging"];
        env.smartContracts.FlashLoanArbitrage.address = await contract.getAddress();
        env.smartContracts.FlashLoanArbitrage.txHash = deploymentTx.hash;
        env.smartContracts.FlashLoanArbitrage.deployedAt = new Date().toISOString();
        env.smartContracts.FlashLoanArbitrage.deployer = deploymentTx.from;
        
        registry.lastUpdated = new Date().toISOString();
        registry.deploymentHistory.push({
          network: network,
          contract: "FlashLoanArbitrage",
          address: await contract.getAddress(),
          txHash: deploymentTx.hash,
          timestamp: new Date().toISOString()
        });
        
        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
        console.log("Updated DEPLOYMENT_REGISTRY.json");
      }
    }
  } catch (error) {
    console.log("Could not update registry:", error.message);
  }
  
  return await contract.getAddress();
}

main()
  .then((address) => {
    console.log("\n========================================");
    console.log("✅ Deployment Successful!");
    console.log("========================================");
    console.log(`Contract Address: ${address}`);
    console.log(`Network: ${hre.network.name}`);
    console.log("\nNext steps:");
    console.log("1. Update .env.production with ARBITRADE_CONTRACT_ADDRESS");
    console.log("2. Deploy backend services");
    console.log("3. Configure Pimlico paymaster for gasless transactions");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n========================================");
    console.error("❌ Deployment Failed!");
    console.error("========================================");
    console.error(error.message);
    process.exit(1);
  });
