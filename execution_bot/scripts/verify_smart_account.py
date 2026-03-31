import os
import sys
from web3 import Web3
from dotenv import load_dotenv
import requests

def verify_smart_account():
    """
    Performs on-chain verification of the EIP-4337 Smart Account.
    Validates predicted address, deployment status, and EntryPoint registration.
    """
    print("\n🚀 AlphaMark: Smart Account Verification")
    print("========================================")
    load_dotenv()
    
    rpc_url = os.environ.get("ETH_RPC_URL") or os.environ.get("ETHEREUM_RPC")
    wallet_owner = os.environ.get("WALLET_ADDRESS")
    pimlico_key = os.environ.get("PIMLICO_API_KEY")
    biconomy_key = os.environ.get("BICONOMY_API_KEY") or "mee_3ZUAvWL62BBVb2EjVPZwNUaF"
    
    if not rpc_url or not wallet_owner:
        print("❌ FAIL: Environment missing ETH_RPC_URL or WALLET_ADDRESS.")
        return

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print(f"❌ FAIL: RPC connection failed: {rpc_url}")
        return

    # Factory and EntryPoint (Standard SimpleAccount configuration)
    FACTORY_ADDR = "0x9406Cc6185a346906296840746125a0E44976454"
    ENTRYPOINT_ADDR = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
    
    factory_abi = [{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"salt","type":"uint256"}],"name":"getAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]
    nonce_abi = [{"inputs": [{"internalType": "address", "name": "sender", "type": "address"}, {"internalType": "uint192", "name": "key", "type": "uint192"}], "name": "getNonce", "outputs": [{"internalType": "uint256", "name": "nonce", "type": "uint256"}], "stateMutability": "view", "type": "function"}]
    deposit_abi = [{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"getDepositInfo","outputs":[{"components":[{"internalType":"uint112","name":"deposit","type":"uint112"},{"internalType":"bool","name":"staked","type":"bool"},{"internalType":"uint112","name":"stake","type":"uint112"},{"internalType":"uint32","name":"unstakeDelaySec","type":"uint32"},{"internalType":"uint64","name":"withdrawTime","type":"uint64"}],"internalType":"struct IStakeManager.DepositInfo","name":"info","type":"tuple"}],"stateMutability":"view","type":"function"}]

    # 1. Check Paymaster Deposits
    providers = [
        {"name": "Pimlico", "url": f"https://api.pimlico.io/v2/{w3.eth.chain_id}/rpc?apikey={pimlico_key}"},
        {"name": "Biconomy", "url": f"https://paymaster.biconomy.io/api/v1/{w3.eth.chain_id}/{biconomy_key}"}
    ]

    for provider in providers:
        print(f"⏳ Verifying {provider['name']} Paymaster deposit...")
        try:
            dummy_op = {"sender": Web3.to_checksum_address(wallet_owner), "nonce": "0x0", "initCode": "0x", "callData": "0x", "maxFeePerGas": "0x0", "maxPriorityFeePerGas": "0x0", "paymasterAndData": "0x", "signature": "0x"}
            resp = requests.post(provider["url"], json={
                "jsonrpc": "2.0", "method": "pm_paymasterAndData", "params": [dummy_op, ENTRYPOINT_ADDR, "0x"], "id": 1
            }, timeout=10).json()

            if "result" in resp:
                pm_data = resp['result'].get('paymasterAndData', '')
                if len(pm_data) >= 42:
                    pm_addr = Web3.to_checksum_address(pm_data[:42])
                    ep_contract = w3.eth.contract(address=Web3.to_checksum_address(ENTRYPOINT_ADDR), abi=deposit_abi)
                    deposit = ep_contract.functions.getDepositInfo(pm_addr).call()[0]
                    deposit_eth = w3.from_wei(deposit, 'ether')
                    if deposit > 0:
                        print(f"   ✅ {provider['name']} Deposit: {deposit_eth} ETH")
                    else:
                        print(f"   ❌ {provider['name']} has NO deposit.")
                else:
                    print(f"   ⚠️ {provider['name']}: Could not resolve address.")
            else:
                print(f"   ❌ {provider['name']} API Error.")
        except Exception as e:
            print(f"   ❌ {provider['name']} connection failed: {e}")

    print("-" * 40)

    try:
        factory = w3.eth.contract(address=Web3.to_checksum_address(FACTORY_ADDR), abi=factory_abi)
        sender_address = factory.functions.getAddress(Web3.to_checksum_address(wallet_owner), 0).call()
        
        print(f"ℹ️  Owner Address:  {wallet_owner}")
        print(f"ℹ️  Account Address: {sender_address}")

        # Check Bytecode
        code = w3.eth.get_code(sender_address)
        is_deployed = len(code) > 2
        
        # Check EntryPoint Nonce
        ep_contract = w3.eth.contract(address=Web3.to_checksum_address(ENTRYPOINT_ADDR), abi=nonce_abi)
        nonce = ep_contract.functions.getNonce(sender_address, 0).call()

        if is_deployed:
            print(f"✅ SUCCESS: Smart Account is created and deployed. (Nonce: {nonce})")
        else:
            print("✅ SUCCESS: Smart Account is counter-factual and ready for gasless creation.")
            print("   Note: Deployment will occur automatically during the first transaction.")
            
    except Exception as e:
        print(f"❌ FAIL: Verification error: {e}")

if __name__ == "__main__":
    verify_smart_account()