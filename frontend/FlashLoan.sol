// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ILendingPool.sol";

contract FlashLoan {
    using SafeERC20 for IERC20;

    address public owner;
    ILendingPool public lendingPool;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;\
    }

    constructor(address _lendingPool) {
        owner = msg.sender;
        lendingPool = ILendingPool(_lendingPool);
    }

    function executeFlashLoan(
        address _asset,
        uint256 _amount,
        bytes calldata _params
    ) external onlyOwner {
        address receiverAddress = address(this);
        address onBehalfOf = address(this);
        uint16 referralCode = 0;

        lendingPool.flashLoan(
            receiverAddress,
            _asset,
            _amount,
            _params,
            onBehalfOf,
            referralCode
        );
    }

    /**
     * @dev This function is called by the Aave protocol's LendingPool contract after the flash loan is executed.
     * @param _asset The address of the asset that was loaned
     * @param _amount The amount of the asset that was loaned
     * @param _premium The fee that needs to be paid back to the Aave protocol
     * @return bool Returns true if the flash loan was successful
     */
    function executeOperation(
        address _asset,
        uint256 _amount,
        uint256 _premium,
        address /*_initiator*/,
        bytes calldata /*_params*/
    ) external returns (bool) {
        // Your arbitrage logic will go here.
        // For now, we'll just approve the payback of the loan + premium.

        uint256 amountToRepay = _amount + _premium;
        IERC20(_asset).approve(address(lendingPool), amountToRepay);

        return true;
    }

    receive() external payable {}
}