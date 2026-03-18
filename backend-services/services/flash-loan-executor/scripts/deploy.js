const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying V08-Elite FlashArbExecutor...");

    // Default Flash Loan Provider (Aave V3 Pool usually)
    // Polygon Aave V3 Pool: 0x794a61358D6845594F94dc1DB02A252b5b4814aD
    const flashLoanProvider = process.env.FLASH_LOAN_PROVIDER || "0x794a61358D6845594F94dc1DB02A252b5b4814aD";

    const FlashArbExecutor_V08_Elite = await hre.ethers.getContractFactory("FlashArbExecutor_V08_Elite");
    const kernel = await FlashArbExecutor_V08_Elite.deploy(flashLoanProvider);

    await kernel.waitForDeployment(); // Updated for newer Hardhat/Ethers

    console.log(
        `✅ V08-Elite Kernel deployed to: ${kernel.target}`
    );

    if (hre.network.name !== "hardhat") {
        console.log("Please verify on block explorer:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${kernel.target} ${flashLoanProvider}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
