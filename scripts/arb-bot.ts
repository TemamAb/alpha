import { ethers } from "ethers";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const AAVE_POOL_MUMBAI = "0x5EcD2f363Heading6BE9Daa1700Ed3EFeF54904F8"; // Mumbai Aave V3 Pool
const CONTRACT_ADDRESS = "0x..."; // Update after deploy
const USDC_ADDRESS = "0xA1DabEFa748F2aD4BC644d26D6c474837b0A8B6"; // Fake Mumbai USDC

async function checkArbitrageOpportunity(flashAmount: string) {
  // Query 1inch API for price quotes
  const sunswapQuote = await axios.get(`https://api.1inch.io/v5.2/137/quote?from=${USDC_ADDRESS}&to=WMATIC&amount=${flashAmount}`);
  const quickswapQuote = await axios.get(`https://api.1inch.io/v5.2/137/quote?from=WMATIC&to=${USDC_ADDRESS}&amount=${sunswapQuote.data.toTokenAmount}`);

  const profit = quickswapQuote.data.toTokenAmount - ethers.parseUnits("1000000", 6) * 1.0005n; // USDC 6dec, +0.05% fee

  if (profit > 0) {
    console.log(`Profit opportunity: ${ethers.formatEther(profit)} USDC`);
    return true;
  }
  return false;
}

async function executeArb(contractAddress: string, flashAmount: string) {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(contractAddress, ["function startFlashLoan(address,uint256)"], wallet);

  const tx = await contract.startFlashLoan(USDC_ADDRESS, ethers.parseUnits(flashAmount, 6));
  await tx.wait();
  console.log("Arb executed:", tx.hash);
}

async function main() {
  const FLASH_AMOUNT = "1000000"; // 1 USDC.e *10^6
  while (true) {
    if (await checkArbitrageOpportunity(FLASH_AMOUNT)) {
      await executeArb(CONTRACT_ADDRESS, FLASH_AMOUNT);
    }
    await new Promise(r => setTimeout(r, 10000)); // Poll every 10s
  }
}

main().catch(console.error);

