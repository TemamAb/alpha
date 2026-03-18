#!/usr/bin/env node

/**
 * Alpha-Orion Multi-Chain Smart Contract Deployment Script
 * Deploys FlashLoanArbitrageEnhanced.sol across multiple networks
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const NETWORKS = {
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    confirmations: 12,
    verify: true,
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    confirmations: 1,
    verify: true,
  },
  polygon_zkevm: {
    name: "Polygon zkEVM",
    chainId: 1101,
    confirmations: 2,
    verify: true,
  },
  polygon: {
    name: "Polygon PoS",
    chainId: 137,
    confirmations: 2,
    verify: true,
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    confirmations: 1,
    verify: true,
  },
};

const DEPLOYMENT_CONFIG = {
  paymaster: process.env.PIMLICO_PAYMASTER_ADDRESS || "0x0000000000000000000000000000000000000000",
  feeRecipient: process.env.FEE_RECIPIENT_ADDRESS || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  protocolFeeBps: 100, // 1%
  maxSlippageBps: 50,  // 0.5%
};

class MultiChainDeployer {
  constructor() {
    this.deployments = {};
    this.startTime = Date.now();
  }

  log(message, network = "") {
    const timestamp = new Date().toISOString();
    const networkTag = network ? `[${network}]` : "";
    console.log(`${timestamp} ${networkTag} ${message}`);
  }

  async deployToNetwork(networkName) {
    const network = NETWORKS[networkName];
    if (!network) {
      throw new Error(`Unknown network: ${networkName}`);
    }

    this.log(`Starting deployment to ${network.name}`, networkName);

    try {
      // Switch to network
      hre.changeNetwork(networkName);

      // Get deployer account
      const [deployer] = await hre.ethers.getSigners();
      const balance = await deployer.getBalance();

      this.log(`Deployer: ${deployer.address}`, networkName);
      this.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH`, networkName);

      // Deploy contract
      const FlashLoanArbitrageEnhanced = await hre.ethers.getContractFactory("FlashLoanArbitrageEnhanced");

      this.log("Deploying FlashLoanArbitrageEnhanced...", networkName);

      const contract = await FlashLoanArbitrageEnhanced.deploy(
        DEPLOYMENT_CONFIG.paymaster,
        DEPLOYMENT_CONFIG.feeRecipient
      );

      this.log(`Transaction hash: ${contract.deployTransaction.hash}`, networkName);

      // Wait for confirmations
      this.log(`Waiting for ${network.confirmations} confirmations...`, networkName);
      await contract.deployTransaction.wait(network.confirmations);

      const deployment = {
        network: networkName,
        chainId: network.chainId,
        contractAddress: contract.address,
        deployer: deployer.address,
        paymaster: DEPLOYMENT_CONFIG.paymaster,
        feeRecipient: DEPLOYMENT_CONFIG.feeRecipient,
        protocolFeeBps: DEPLOYMENT_CONFIG.protocolFeeBps,
        maxSlippageBps: DEPLOYMENT_CONFIG.maxSlippageBps,
        transactionHash: contract.deployTransaction.hash,
        blockNumber: contract.deployTransaction.blockNumber,
        gasUsed: contract.deployTransaction.gasLimit.toString(),
        timestamp: new Date().toISOString(),
        verified: false,
      };

      // Configure contract parameters
      await this.configureContract(contract, networkName);

      // Verify contract if enabled
      if (network.verify && this.shouldVerify(networkName)) {
        await this.verifyContract(contract, deployment, networkName);
      }

      // Save deployment info
      this.saveDeployment(deployment, networkName);

      this.deployments[networkName] = deployment;

      this.log(`✅ Deployment to ${network.name} completed successfully!`, networkName);
      this.log(`Contract address: ${contract.address}`, networkName);

      return deployment;

    } catch (error) {
      this.log(`❌ Deployment to ${network.name} failed: ${error.message}`, networkName);
      throw error;
    }
  }

  async configureContract(contract, networkName) {
    this.log("Configuring contract parameters...", networkName);

    // Set protocol fee
    if (DEPLOYMENT_CONFIG.protocolFeeBps !== 100) {
      await contract.setProtocolFee(DEPLOYMENT_CONFIG.protocolFeeBps);
      this.log(`Set protocol fee to ${DEPLOYMENT_CONFIG.protocolFeeBps} bps`, networkName);
    }

    // Set max slippage
    if (DEPLOYMENT_CONFIG.maxSlippageBps !== 50) {
      await contract.setMaxSlippage(DEPLOYMENT_CONFIG.maxSlippageBps);
      this.log(`Set max slippage to ${DEPLOYMENT_CONFIG.maxSlippageBps} bps`, networkName);
    }

    // Enable multi-DEX support
    await contract.setMultiDEXEnabled(true);
    this.log("Enabled multi-DEX support", networkName);

    // Set MEV protection mode
    await contract.setMEVProtectionMode(2); // HYBRID mode
    this.log("Set MEV protection to HYBRID mode", networkName);
  }

  shouldVerify(networkName) {
    // Skip verification for testnets unless explicitly enabled
    const testnets = ['sepolia', 'goerli', 'arbitrum_goerli', 'polygon_zkevm_testnet'];
    if (testnets.includes(networkName) && !process.env.VERIFY_TESTNETS) {
      return false;
    }
    return true;
  }

  async verifyContract(contract, deployment, networkName) {
    try {
      this.log("Verifying contract on block explorer...", networkName);

      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [
          DEPLOYMENT_CONFIG.paymaster,
          DEPLOYMENT_CONFIG.feeRecipient
        ],
      });

      deployment.verified = true;
      this.log("✅ Contract verified successfully", networkName);

    } catch (error) {
      this.log(`⚠️ Contract verification failed: ${error.message}`, networkName);
      this.log("Manual verification may be required", networkName);
    }
  }

  saveDeployment(deployment, networkName) {
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filename = `${networkName}.json`;
    const filepath = path.join(deploymentsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(deployment, null, 2));
    this.log(`Deployment info saved to ${filename}`, networkName);
  }

  generateSummaryReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;

    const report = {
      summary: {
        totalNetworks: Object.keys(this.deployments).length,
        successfulDeployments: Object.values(this.deployments).filter(d => d.contractAddress).length,
        failedDeployments: Object.keys(NETWORKS).length - Object.keys(this.deployments).length,
        totalDuration: `${duration.toFixed(2)} seconds`,
        timestamp: new Date().toISOString(),
      },
      deployments: this.deployments,
      config: DEPLOYMENT_CONFIG,
    };

    const reportPath = path.join(__dirname, "../deployments/deployment-summary.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log("\n" + "=".repeat(80));
    console.log("🚀 ALPHA-ORION MULTI-CHAIN DEPLOYMENT SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Networks: ${report.summary.totalNetworks}`);
    console.log(`Successful Deployments: ${report.summary.successfulDeployments}`);
    console.log(`Failed Deployments: ${report.summary.failedDeployments}`);
    console.log(`Total Duration: ${report.summary.totalDuration}`);
    console.log("\n📋 Deployments:");

    Object.entries(this.deployments).forEach(([network, deployment]) => {
      console.log(`  ${network}: ${deployment.contractAddress} (${deployment.verified ? 'verified' : 'unverified'})`);
    });

    console.log("\n📄 Full report saved to: deployments/deployment-summary.json");
    console.log("=".repeat(80));
  }

  async run(networks = null) {
    const targetNetworks = networks || Object.keys(NETWORKS);

    console.log("🚀 Starting Alpha-Orion Multi-Chain Deployment");
    console.log(`Target networks: ${targetNetworks.join(", ")}`);
    console.log(`Paymaster: ${DEPLOYMENT_CONFIG.paymaster}`);
    console.log(`Fee Recipient: ${DEPLOYMENT_CONFIG.feeRecipient}`);
    console.log("-".repeat(80));

    for (const networkName of targetNetworks) {
      try {
        await this.deployToNetwork(networkName);
        // Small delay between deployments
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.log(`Skipping ${networkName} due to error: ${error.message}`);
        continue;
      }
    }

    this.generateSummaryReport();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  let networks = null;

  if (args.length > 0) {
    networks = args[0].split(",").map(n => n.trim());
    console.log(`Deploying to specified networks: ${networks.join(", ")}`);
  }

  const deployer = new MultiChainDeployer();
  await deployer.run(networks);
}

if (require.main === module) {
  main()
    .then(() => {
      console.log("🎉 Multi-chain deployment completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = MultiChainDeployer;
