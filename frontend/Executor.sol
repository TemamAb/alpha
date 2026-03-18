// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract Executor {
    using SafeERC20 for IERC20;

    address public owner;
    address public flashLoanContract;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;\
    }

    modifier onlyFlashLoanContract() {
        require(msg.sender == flashLoanContract, "Only the flash loan contract can call this function.");
        _;\
    }

    constructor() {
        owner = msg.sender;
    }

    function setFlashLoanContract(address _flashLoanContract) external onlyOwner {
        flashLoanContract = _flashLoanContract;
    }

    function executeTrade(
        address _dexRouter,
        address _tokenIn,
        address /*_tokenOut*/,
        uint256 _amountIn
    ) external onlyFlashLoanContract {
        // This is where the arbitrage logic will go.
        // For now, we'll just approve the DEX to spend the token.
        IERC20(_tokenIn).approve(_dexRouter, _amountIn);

        // The actual swap would happen here.
        // IUniswapV2Router02(_dexRouter).swapExactTokensForTokens(...);
    }
}