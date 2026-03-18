// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IPool.sol";
import "./interfaces/IUniswapV2Router02.sol";

/**
 * @title ArbitrageExecutor
 * @author Chief Architect, Alpha-Orion
 * @notice This contract is the core on-chain component for executing flash loan arbitrage.
 * It borrows from an Aave-compatible lending pool, executes trades on a DEX,
 * and repays the loan in a single atomic transaction.
 */
contract ArbitrageExecutor {
    using SafeERC20 for IERC20;

    address public immutable owner;
    IPool public immutable POOL;
    address private constant AAVE_POOL_ADDRESS_PROVIDER = 0x2f39d218d388dC8220B07321A491634Ad94E9e; // Sepolia V3

    modifier onlyOwner() {
        require(msg.sender == owner, "AO: Caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        POOL = IPool(AAVE_POOL_ADDRESS_PROVIDER);
    }

    /**
     * @notice Initiates a flash loan arbitrage trade.
     * @param loanAsset The address of the asset to borrow.
     * @param loanAmount The amount of the asset to borrow.
     * @param tradeData Abi-encoded data for the trade execution logic.
     */
    function startArbitrage(
        address loanAsset,
        uint256 loanAmount,
        bytes calldata tradeData
    ) external onlyOwner {
        address receiverAddress = address(this);

        // Request the flash loan from the Aave Pool
        POOL.flashLoanSimple(receiverAddress, loanAsset, loanAmount, tradeData, 0);
    }

    /**
     * @notice This is the callback function that Aave's Pool calls.
     * It contains the logic to be executed with the borrowed funds.
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == address(POOL), "AO: Caller is not the Aave Pool");
        require(initiator == address(this), "AO: Initiator is not this contract");

        // Arbitrage logic will be decoded from `params` and executed here.
        // For now, we simulate a profitable trade by ensuring we can pay back the loan.
        // In a real trade, profit would be generated here before this step.

        uint256 amountToRepay = amount + premium;
        
        // Approve the Aave Pool to pull back the funds
        IERC20(asset).approve(address(POOL), amountToRepay);

        return true;
    }

    // Fallback to receive ETH if needed for gas or other purposes
    receive() external payable {}
}