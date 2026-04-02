// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";


interface IQuickswapRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface ISunswapRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase {
    address public owner;
    address constant QUICKSWAP_ROUTER = 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff; // Polygon Quickswap V2 Router
    address constant SUNSWAP_ROUTER = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506; // Sunswap Router Polygon
    address constant WMATIC = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174; // USDC.e Polygon

    constructor(address provider) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(provider)) {
        owner = msg.sender;
    }

    /**
     * Initiate flash loan.
     */
    function startFlashLoan(address asset, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        POOL.flashLoanSimple(address(this), asset, amount, bytes(""), 0);
    }

    /**
     * Aave callback: Execute arbitrage.
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /*initiator*/,
        bytes calldata /*params*/
    ) external override returns (bool) {
        // Step 1: Buy WMATIC cheap on Sunswap with USDC flash loan
        IERC20(asset).approve(SUNSWAP_ROUTER, amount);
        address[] memory pathBuy = new address[](2);
        pathBuy[0] = asset; // USDC
        pathBuy[1] = WMATIC;
        uint amountOutBuyMin = amount * 95 / 100; // 5% slippage max
        ISunswapRouter(SUNSWAP_ROUTER).swapExactTokensForTokens(
            amount,
            amountOutBuyMin,
            pathBuy,
            address(this),
            block.timestamp + 300
        );

        // Get WMATIC balance
        uint wmaticBalance = IERC20(WMATIC).balanceOf(address(this));

        // Step 2: Sell WMATIC expensive on Quickswap for USDC
        IERC20(WMATIC).approve(QUICKSWAP_ROUTER, wmaticBalance);
        address[] memory pathSell = new address[](2);
        pathSell[0] = WMATIC;
        pathSell[1] = asset; // USDC
        uint amountOutSellMin = 0; // Calculate min for profit check
        IQuickswapRouter(QUICKSWAP_ROUTER).swapExactTokensForTokens(
            wmaticBalance,
            amountOutSellMin,
            pathSell,
            address(this),
            block.timestamp + 300
        );

        // Step 3: Repay flash loan + premium
        uint totalDebt = amount + premium;
        require(IERC20(asset).balanceOf(address(this)) >= totalDebt, "No profit");
        IERC20(asset).transfer(POOL, totalDebt);

        return true;
    }

    // Get profit balance (USDC)
    function getProfitBalance() external view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }

    // Withdraw profits
    function withdraw(address asset) external {
        require(msg.sender == owner, "Only owner");
        IERC20(asset).transfer(owner, IERC20(asset).balanceOf(address(this)));
    }
}

