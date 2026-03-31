import os
import sys
from web3 import Web3
from dotenv import load_dotenv
import json
import requests

def run_checks():
    print("\n🚀 Starting Production Pre-Flight Checks...")
    load_dotenv()
    
    # 1. Validate Core Secrets
    required_secrets = ["PRIVATE_KEY", "PIMLICO_API_KEY", "FLASHLOAN_CONTRACT_ADDRESS"]
    for secret in required_secrets:
        if not os.environ.get(secret):
            print(f"❌ FAIL: Essential secret {secret} is missing from environment.")
            return False
    print("✅ Secrets Validation: OK")

    # 2. Check Primary RPC Connectivity
    primary_rpc = os.environ.get("ETH_RPC_URL") or os.environ.get("ETHEREUM_RPC")
    if not primary_rpc:
        print("❌ FAIL: No primary ETH_RPC_URL found.")
        return False
    
    try:
        w3 = Web3(Web3.HTTPProvider(primary_rpc))
        if not w3.is_connected():
            raise ConnectionError(f"Could not connect to {primary_rpc}")
        print(f"✅ Primary RPC Connection: OK (ChainID: {w3.eth.chain_id})")
    except Exception as e:
        print(f"❌ FAIL: RPC Connectivity issue: {e}")
        return False

    # 2.5 Gasless Signer Check
    wallet_addr = os.environ.get("WALLET_ADDRESS")
    if wallet_addr:
        balance = w3.eth.get_balance(Web3.to_checksum_address(wallet_addr))
        print(f"ℹ️  Signer Balance: {w3.from_wei(balance, 'ether')} ETH (Gasless Mode: Active)")
    
    pimlico_key = os.environ.get("PIMLICO_API_KEY")
    if not pimlico_key:
        print("❌ FAIL: PIMLICO_API_KEY is missing.")
        return False

    biconomy_key = os.environ.get("BICONOMY_API_KEY") or "mee_3ZUAvWL62BBVb2EjVPZwNUaF"

    # Validate Paymasters and On-Chain Gasless Capability
    print(f"⏳ Verifying Gasless Paymasters (Pimlico & Biconomy)...")
    ENTRYPOINT_ADDR = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
    
    providers = [
        {"name": "Pimlico", "url": f"https://api.pimlico.io/v2/{w3.eth.chain_id}/rpc?apikey={pimlico_key}"},
        {"name": "Biconomy", "url": f"https://paymaster.biconomy.io/api/v1/{w3.eth.chain_id}/{biconomy_key}"}
    ]

    for provider in providers:
        try:
            print(f"   Checking {provider['name']}...")
            dummy_op = {"sender": Web3.to_checksum_address(wallet_addr), "nonce": "0x0", "initCode": "0x", "callData": "0x", "maxFeePerGas": "0x0", "maxPriorityFeePerGas": "0x0", "paymasterAndData": "0x", "signature": "0x"}
            resp = requests.post(provider["url"], json={
                "jsonrpc": "2.0", "method": "pm_paymasterAndData", "params": [dummy_op, ENTRYPOINT_ADDR, "0x"], "id": 1
            }, timeout=10).json()

            if "result" in resp:
                pm_data = resp['result'].get('paymasterAndData', '')
                if len(pm_data) >= 42:
                    pm_addr = Web3.to_checksum_address(pm_data[:42])
                    ep_contract = w3.eth.contract(address=ENTRYPOINT_ADDR, abi=[{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"getDepositInfo","outputs":[{"components":[{"internalType":"uint112","name":"deposit","type":"uint112"},{"internalType":"bool","name":"staked","type":"bool"},{"internalType":"uint112","name":"stake","type":"uint112"},{"internalType":"uint32","name":"unstakeDelaySec","type":"uint32"},{"internalType":"uint64","name":"withdrawTime","type":"uint64"}],"internalType":"struct IStakeManager.DepositInfo","name":"info","type":"tuple"}],"stateMutability":"view","type":"function"}])
                    deposit = ep_contract.functions.getDepositInfo(pm_addr).call()[0]
                    
                    deposit_eth = w3.from_wei(deposit, 'ether')
                    print(f"   ✅ {provider['name']} Status: Verified ({deposit_eth} ETH Deposit)")
                else:
                    print(f"   ⚠️ {provider['name']} Warning: Could not resolve Paymaster address.")
            else:
                 print(f"   ❌ {provider['name']} Error: {resp.get('error', {}).get('message', 'Unknown')}")
        except Exception as e:
            print(f"   ❌ {provider['name']} Connection failed: {e}")

    # 2.6 Smart Account (Sender) Nonce Check
    print(f"⏳ Checking Smart Account (EIP-4337) Status...")
    FACTORY_ADDR = "0x9406Cc6185a346906296840746125a0E44976454"
    factory_abi = [{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"salt","type":"uint256"}],"name":"getAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]
    nonce_abi = [{"inputs": [{"internalType": "address", "name": "sender", "type": "address"}, {"internalType": "uint192", "name": "key", "type": "uint192"}], "name": "getNonce", "outputs": [{"internalType": "uint256", "name": "nonce", "type": "uint256"}], "stateMutability": "view", "type": "function"}]
    
    try:
        factory = w3.eth.contract(address=Web3.to_checksum_address(FACTORY_ADDR), abi=factory_abi)
        sender_address = factory.functions.getAddress(Web3.to_checksum_address(wallet_addr), 0).call()
        print(f"ℹ️  Predicted Smart Account: {sender_address}")
        
        # Check if account is already deployed
        code = w3.eth.get_code(sender_address)
        is_deployed = len(code) > 2
        
        # Check Nonce on EntryPoint
        ep_nonce_contract = w3.eth.contract(address=Web3.to_checksum_address(ENTRYPOINT_ADDR), abi=nonce_abi)
        nonce = ep_nonce_contract.functions.getNonce(sender_address, 0).call()
        
        if is_deployed:
            print(f"✅ Smart Account Verification: Bytecode detected at {sender_address}")
            print(f"✅ Smart Account Status: Active (Nonce: {nonce})")
        else:
            print(f"✅ Smart Account Verification: Ready for counter-factual deployment.")
            print(f"   Note: initCode will trigger creation on first trade for {sender_address}")
    except Exception as e:
        print(f"⚠️  WARNING: Could not verify Smart Account status: {e}")
    
    # 3. Verify Flashloan Contract Existence
    contract_addr = os.environ.get("FLASHLOAN_CONTRACT_ADDRESS")
    try:
        checksum_addr = Web3.to_checksum_address(contract_addr)
        
        # Check if address is the same as the wallet (common mistake)
        if checksum_addr.lower() == (os.environ.get("WALLET_ADDRESS") or "").lower():
            print(f"❌ FAIL: FLASHLOAN_CONTRACT_ADDRESS is set to your WALLET address.")
            print(f"   Action: You must deploy the FlashLoan contract first or set the correct contract address.")
            return False

        code = w3.eth.get_code(checksum_addr)
        if len(code) <= 2:
            print(f"❌ FAIL: No contract bytecode found at {contract_addr}.")
            print(f"   Reason: Arbitrage logic not deployed on Chain ID {w3.eth.chain_id}.")
            return False
            
        print(f"✅ Flashloan Contract Verified: OK")
    except Exception as e:
            print(f"❌ FAIL: Contract validation error: {e}")
            return False

    print("✅ Pre-flight checks passed.")
    return True

if __name__ == "__main__":
    if not run_checks():
        sys.exit(1)
    sys.exit(0)