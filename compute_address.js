const { ethers } = require('ethers');
const deployer = "0x748Aa8ee067585F5bd02f0988eF6E71f2d662751";
const nonce = 0;
const address = ethers.utils.getContractAddress({ from: deployer, nonce: nonce });
console.log("Computed FlashLoan Address (Nonce 0):", address);
