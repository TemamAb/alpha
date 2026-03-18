// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Treasury {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;\
    }

    constructor() {
        owner = msg.sender;
    }

    function withdraw(address payable _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Cannot withdraw to the zero address.");
        // Use .call instead of .transfer for safer Ether transfers
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Failed to send Ether");
    }

    receive() external payable {}
}