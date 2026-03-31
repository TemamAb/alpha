import { ethers } from "ethers";
import * as dotenv from "dotenv";
import axios from "axios";
import { createPimlicoBundlerClient } from "@pimlico/bundler";
import { createPimlicoPaymasterClient } from "@pimlico/paymaster";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { polygonMumbai } from "viem/chains";
import { createWalletClient } from "viem";
dotenv.config();

const PIMLICO_BUNDLER_URL = `https://bundler.pimlico.io/v2/polygon-amoy/rpc`; // Mumbai
const PIMLICO_PAYMASTER_URL = `https://paymaster.pimlico.io/polygon-amoy/...`;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;
const USDC = "0x...USDCe_Mumbai";

const account = privateKeyToAccount("0x" + process.env.PRIVATE_KEY?.slice(2) as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: polygonMumbai,
});

const bundler = createPimlicoBundlerClient({
  url: PIMLICO_BUNDLER_URL,
  apiKey: process.env.PIMLICO_API_KEY as `pk_${string}`,
});

const paymaster = createPimlicoPaymasterClient({
  url: PIMLICO_PAYMASTER_URL,
  apiKey: process.env.PIMLICO_API_KEY as `pk_${string}`,
});

async function checkArbitrageOpportunity(flashAmount: bigint) {
  const { data: sunQuote } = await axios.get(`https://api.1inch.dev/swap/v6.0/80001/quote?src=${USDC}&dst=WMATIC&amount=${flashAmount}`);
  const amountOutBuy = BigInt(sunQuote.toTokenAmount);
  const { data: quickQuote } = await axios.get(`https://api.1inch.dev/swap/v6.0/80001/quote?src=WMATIC&dst=${USDC}&amount=${amountOutBuy}`);
  const profit = BigInt(quickQuote.toTokenAmount) - flashAmount * 10005n / 10000n; // +0.05% fee
  return profit > 0n ? { profit, amountOutBuy } : null;
}

async function executeGaslessArb() {
  const FLASH_AMOUNT = 1_000_000n; // 1 USDC
  const opportunity = await checkArbitrageOpportunity(FLASH_AMOUNT);
  if (!opportunity) return;

  const userOp = {
    sender: account.address as `0x${string}`,
    nonce: await bundler.getUserOperationNonce(account.address, 0n),
    initCode: "0x",
    callData: new ethers.Contract(CONTRACT_ADDRESS, ["function startFlashLoan(address,uint256)"], ethers.Wallet.createRandom()).interface.encodeFunctionData("startFlashLoan", [USDC, FLASH_AMOUNT]),
    callGasLimit: 1_000_000n,
    verificationGasLimit: 150_000n,
    preVerificationGas: 60_000n,
    maxFeePerGas: 10_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    paymasterAndData: await paymaster.getPaymasterAndData({userId: "sponsor"}),
    signature: "0x"
  };

  const userOpHash = await bundler.sendUserOperation(userOp, { account });
  console.log("Gasless arb tx:", userOpHash);
}

async function main() {
  while (true) {
    await executeGaslessArb();
    await new Promise(r => setTimeout(r, 10_000));
  }
}

main().catch(console.error);

