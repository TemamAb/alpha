import os
import json
from web3 import Web3
from dotenv import load_dotenv
import requests
import sys
from eth_account import Account

def deploy_contract():
    print("\n🚀 AlphaMark: Initializing Gasless Sponsored Deployment...")
    load_dotenv()
    
    rpc_url = os.getenv('ETH_RPC_URL')
    private_key = os.getenv('PRIVATE_KEY')
    pimlico_key = os.getenv('PIMLICO_API_KEY')
    
    if not all([rpc_url, private_key, pimlico_key]):
        print("❌ FAIL: Missing environment variables for gasless deployment.")
        return

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    account = w3.eth.account.from_key(private_key)
    
    # Load Artifact (Assuming standard Hardhat structure)
    artifact_path = "smart_contracts/artifacts/contracts/FlashLoan.sol/FlashLoan.json"
    if not os.path.exists(artifact_path):
        print(f"❌ FAIL: Artifact not found at {artifact_path}. Run 'npx hardhat compile' first.")
        return

    # ARCHITECT: Add script paths to find core execution logic
    PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, os.path.join(PROJECT_ROOT, "execution_bot", "scripts"))
    try:
        from executor import get_user_op_hash
        from check_contract import compute_contract_address
    except ImportError:
        print("❌ FAIL: Could not import execution utilities. Ensure script paths are correct.")
        return

    with open(artifact_path, "r") as f:
        artifact = json.load(f)

    # Construct the deployment data
    # Since we are gasless, we send this via a UserOperation to the EntryPoint
    print(f"🛰️  Chain ID: {w3.eth.chain_id} | Signer: {account.address}")
    print("⏳ Constructing Sponsored UserOperation for Contract Creation...")

    # 1. Get Smart Account Address
    # Using the SimpleAccountFactory from context
    factory_addr = "0x9406Cc6185a346906296840746125a0E44976454"
    factory_abi = [{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"salt","type":"uint256"}],"name":"getAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]
    factory = w3.eth.contract(address=factory_addr, abi=factory_abi)
    sender_address = factory.functions.getAddress(account.address, 0).call()

    # 2. Build UserOp for Contract Deployment
    # Note: This uses the Pimlico 'pm_sponsorUserOperation' flow
    # The 'callData' here will be the deployment bytecode
    deployment_bytecode = artifact['bytecode']
    
    user_op = {
        "sender": sender_address,
        "nonce": hex(w3.eth.get_transaction_count(sender_address)), # Simplified for this script
        "initCode": "0x", # Assume already deployed or added here if needed
        "callData": deployment_bytecode, 
        "maxFeePerGas": hex(w3.eth.gas_price * 2),
        "maxPriorityFeePerGas": hex(w3.to_wei(2, 'gwei')),
        "paymasterAndData": "0x",
        "signature": "0x"
    }

    print(f"✨ Requesting Sponsorship for Smart Account: {sender_address}")
    chain_id = w3.eth.chain_id
    paymaster_url = f"https://api.pimlico.io/v2/{chain_id}/rpc?apikey={pimlico_key}"
    bundler_url = f"https://api.pimlico.io/v1/{chain_id}/rpc?apikey={pimlico_key}"
    
    # Sponsorship request
    response = requests.post(paymaster_url, json={
        "jsonrpc": "2.0", "method": "pm_sponsorUserOperation", "params": [user_op, "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"], "id": 1
    }).json()
    
    if "error" in response:
        print(f"❌ Sponsorship Failed: {response['error']['message']}")
        print("💡 Ensure your Pimlico account has a balance (sponsored credits).")
        return

    user_op.update(response['result'])

    # 3. Sign the UserOperation
    # We use the standard EIP-4337 signature flow
    op_hash = get_user_op_hash(w3, user_op, chain_id)
    user_op["signature"] = account.signHash(op_hash).signature.hex()

    # 4. Submit to Bundler
    print("📡 Submitting UserOperation to Bundler...")
    submission = requests.post(bundler_url, json={
        "jsonrpc": "2.0", "method": "eth_sendUserOperation", "params": [user_op, "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"], "id": 1
    }).json()

    if "error" in submission:
        print(f"❌ Bundler Submission Failed: {submission['error']['message']}")
        return

    user_op_hash_result = submission['result']
    print(f"✅ Sponsored Deployment Sent! UserOp Hash: {user_op_hash_result}")
    
    predicted_addr = compute_contract_address(sender_address, 0)
    print(f"🛰️  FlashLoan contract will be at: {predicted_addr}")
    print(f"\n📝 ACTION REQUIRED: Update your .env with FLASHLOAN_CONTRACT_ADDRESS={predicted_addr}")

if __name__ == "__main__":
    deploy_contract()