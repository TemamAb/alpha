#!/usr/bin/env python3
"""
Check if FlashLoan contract is already deployed
"""
import os
import sys
from web3 import Web3
from eth_utils import keccak, to_bytes
import rlp

def compute_contract_address(sender_address: str, nonce: int) -> str:
    sender_bytes = to_bytes(hexstr=sender_address)
    rlp_data = rlp.encode([sender_bytes, nonce])
    hash_bytes = keccak(rlp_data)
    address_bytes = hash_bytes[-20:]
    return Web3.to_checksum_address(address_bytes.hex())

# Load from .env
WALLET = os.environ.get('WALLET_ADDRESS', '0x748Aa8ee067585F5bd02f0988eF6E71f2d662751')
PIMLICO_KEY = os.environ.get('PIMLICO_API_KEY', '')

rpcs = [
    os.environ.get('ETH_RPC_URL', ''),
    os.environ.get('ETHEREUM_RPC', ''),
    f"https://api.pimlico.io/v1/1/rpc?apikey={PIMLICO_KEY}" if PIMLICO_KEY else '',
    'https://eth.llamarpc.com'
]

w3 = None
for rpc_url in rpcs:
    if not rpc_url: continue
    try:
        temp_w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 15}))
        if temp_w3.is_connected():
            w3 = temp_w3
            print(f"Connected via: {rpc_url[:60]}...")
            break
    except Exception:
        continue

if not w3:
    print("ERROR: Could not connect to any RPC")
    sys.exit(1)

print(f"Connected: {w3.is_connected()}")
print(f"Latest block: {w3.eth.block_number}")

# Check nonce and potential addresses
nonce = w3.eth.get_transaction_count(WALLET)
print(f"\nWallet: {WALLET}")
print(f"Nonce: {nonce}")

# Check up to 10 nonces
print("\nChecking for existing contracts:")
for i in range(10):
    addr = compute_contract_address(WALLET, i)
    try:
        code = w3.eth.get_code(addr)
        if len(code) > 2:
            print(f"✓ FOUND at nonce {i}: {addr}")
            print(f"  Code length: {len(code)} bytes")
            sys.exit(0)
    except Exception as e:
        print(f"Error at {addr}: {e}")

print("\nNo contracts found at predicted addresses.")
print(f"To deploy: npx hardhat run scripts/deploy.js --network ethereum")