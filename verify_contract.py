import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

address = os.environ.get('FLASHLOAN_CONTRACT_ADDRESS')
rpc = os.environ.get('POLYGON_RPC_URL', 'https://polygon-rpc.com')
w3 = Web3(Web3.HTTPProvider(rpc))

if not w3.is_connected():
    print(f"Failed to connect to {rpc}")
else:
    print(f"Connected to {rpc}")
    try:
        code = w3.eth.get_code(Web3.to_checksum_address(address))
        print(f"Code size at {address}: {len(code)}")
        if len(code) > 2:
            print("Contract is deployed.")
        else:
            print("Contract NOT deployed.")
    except Exception as e:
        print(f"Error checking code: {e}")
