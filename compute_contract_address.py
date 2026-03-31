#!/usr/bin/env python3
"""
Compute FlashLoan Contract Address
Dynamically calculates where the contract will be deployed.
"""
import os
import sys
from web3 import Web3
from eth_utils import keccak, to_bytes
import rlp

# Load environment
from dotenv import load_dotenv
load_dotenv()

def compute_contract_address(sender_address: str, nonce: int) -> str:
    """Compute address using CREATE formula"""
    sender_bytes = to_bytes(hexstr=sender_address)
    rlp_data = rlp.encode([sender_bytes, nonce])
    hash_bytes = keccak(rlp_data)
    address_bytes = hash_bytes[-20:]
    return Web3.to_checksum_address(address_bytes.hex())

def main():
    # Get wallet from .env
    wallet_address = os.environ.get('WALLET_ADDRESS', '')
    if not wallet_address:
        print("ERROR: WALLET_ADDRESS not found in .env")
        sys.exit(1)
    
    print(f"Wallet Address: {wallet_address}")
    
    # Try multiple RPCs
    rpcs = [
        os.environ.get('ETH_RPC_URL', ''),
        os.environ.get('ETHEREUM_RPC', ''),
        'https://eth.llamarpc.com',
        'https://cloudflare-eth.com',
    ]
    
    # Add Pimlico only if key is available
    pimlico_key = os.environ.get('PIMLICO_API_KEY')
    if pimlico_key:
        rpcs.append(f'https://api.pimlico.io/v1/1/rpc?apikey={pimlico_key}')
    
    w3 = None
    for rpc in rpcs:
        if rpc:
            try:
                # Add timeout to handle unstable public nodes
                temp_w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={'timeout': 15}))
                if temp_w3.is_connected():
                    w3 = temp_w3
                    print(f"Connected via: {rpc[:60]}...")
                    break
            except Exception:
                continue
    
    if not w3:
        print("ERROR: Could not connect to any Ethereum RPC")
        sys.exit(1)
    
    # Get current nonce
    nonce = w3.eth.get_transaction_count(wallet_address)
    try:
        balance_wei = w3.eth.get_balance(wallet_address)
    except: balance_wei = 0
    
    print(f"Signer Nonce: {nonce} | Balance: {w3.from_wei(balance_wei, 'ether')} ETH")
    
    # Compute next contract addresses
    print("\n--- Potential Contract Addresses ---")
    for i in range(5):
        addr = compute_contract_address(wallet_address, nonce + i)
        # Check if contract exists at this address
        try:
            code = w3.eth.get_code(addr)
            has_code = len(code) > 2
            status = "DEPLOYED ✓" if has_code else "Empty"
        except:
            status = "Unknown"
        print(f"Nonce {nonce + i}: {addr} [{status}]")
    
    print("\n--- Environment Variables to Set ---")
    print(f"DEPLOYER_ADDRESS={wallet_address}")
    print(f"FLASHLOAN_CONTRACT_ADDRESS=<address from above if deployed>")
    print(f"CHAIN=ethereum")

if __name__ == "__main__":
    main()