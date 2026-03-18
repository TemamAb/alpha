// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@aave/core-v3/contracts/flashloan/base/FlashLoanReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
interface IDex { function swap(address tokenIn, address tokenOut, uint amountIn, uint minOut) external returns (uint); }
contract FlashLoan is FlashLoanReceiverBase {
    address owner;
    constructor(IPoolAddressesProvider provider) FlashLoanReceiverBase(provider) { owner = msg.sender; }
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    function executeOperation(address[] calldata assets, uint256[] calldata amounts, uint256[] calldata premiums, address initiator, bytes calldata params) external override returns (bool) {
        for (uint i = 0; i < assets.length; i++) {
            uint amountOwing = amounts[i] + premiums[i];
            IERC20(assets[i]).approve(address(POOL), amountOwing);
        }
        return true;
    }
    function startFlashLoan(address pool, address[] calldata assets, uint256[] calldata amounts, bytes calldata params) external onlyOwner {
        IPool(pool).flashLoan(address(this), assets, amounts, new uint256[](assets.length), address(this), params, 0);
    }
    function withdraw(address token) external onlyOwner {
        uint balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, balance);
    }
}
