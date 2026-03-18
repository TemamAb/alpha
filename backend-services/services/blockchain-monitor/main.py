import asyncio
import json
import os
import time
from datetime import datetime

import redis.asyncio as redis
from dotenv import load_dotenv
from web3 import Web3

# --- Configuration ---
load_dotenv()

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
# The cloudbuild.yaml specifies this RPC_URL, so we default to it.
RPC_URL = os.getenv('RPC_URL', 'https://polygon-rpc.com')

# For real-time events, a WebSocket endpoint is required.
RPC_WEBSOCKET_URL = RPC_URL.replace('https://', 'wss://') if 'https://' in RPC_URL else RPC_URL

# --- Constants ---

# Example: Uniswap V3 Pools on Polygon
CONTRACTS_TO_MONITOR = [
    {
        "name": "Uniswap V3: USDC/WETH",
        "address": Web3.to_checksum_address("0xA374094527e1673A86dE625aa59517c5dE346d32"),
        "chain": "Polygon",
        "tokens": {
            "token0": {"symbol": "USDC", "decimals": 6},
            "token1": {"symbol": "WETH", "decimals": 18}
        },
        "abi": json.loads('[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"int256","name":"amount0","type":"int256"},{"indexed":false,"internalType":"int256","name":"amount1","type":"int256"},{"indexed":false,"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"int24","name":"tick","type":"int24"}],"name":"Swap","type":"event"}]')
    },
    {
        "name": "Uniswap V3: WBTC/WETH",
        "address": Web3.to_checksum_address("0x50eaEDB835021E4A108B7290636d62E9765cc6d7"),
        "chain": "Polygon",
        "tokens": {
            "token0": {"symbol": "WBTC", "decimals": 8},
            "token1": {"symbol": "WETH", "decimals": 18}
        },
        "abi": json.loads('[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"int256","name":"amount0","type":"int256"},{"indexed":false,"internalType":"int256","name":"amount1","type":"int256"},{"indexed":false,"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"int24","name":"tick","type":"int24"}],"name":"Swap","type":"event"}]')
    }
]

REDIS_STREAM_KEY = "blockchain_activity_stream" # For the live table
REDIS_PUBSUB_CHANNEL = "blockchain_stream" # For real-time WebSocket push
MAX_STREAM_LENGTH = 100 # Keep the list in Redis trimmed

print("--- Alpha-Orion Blockchain Monitor ---")
print(f"Connecting to Redis: {REDIS_URL}")
print(f"Connecting to Node: {RPC_WEBSOCKET_URL}")
print(f"Monitoring {len(CONTRACTS_TO_MONITOR)} Contracts on Polygon")
print("--------------------------------------")

async def handle_event(event, redis_client, contract_info):
    """
    Processes a blockchain event and pushes it to Redis.
    """
    try:
        tx_hash = event['transactionHash'].hex()
        block_number = event['blockNumber']
        
        # Uniswap V3 `amount` is a signed int representing the delta
        amount0_delta = event['args']['amount0']
        amount1_delta = event['args']['amount1']

        token0 = contract_info['tokens']['token0']
        token1 = contract_info['tokens']['token1']

        # Determine direction of the swap
        if amount0_delta > 0:
            # User sold token1 for token0
            amount_in = abs(amount1_delta) / (10 ** token1['decimals'])
            amount_out = amount0_delta / (10 ** token0['decimals'])
            details_str = f"{amount_in:.4f} {token1['symbol']} for {amount_out:,.2f} {token0['symbol']}"
            value_str = f"+${amount_out:,.2f}"
        else:
            # User sold token0 for token1
            amount_in = abs(amount0_delta) / (10 ** token0['decimals'])
            amount_out = amount1_delta / (10 ** token1['decimals'])
            details_str = f"{amount_in:,.2f} {token0['symbol']} for {amount_out:.4f} {token1['symbol']}"
            value_str = f"+${amount_in:,.2f}" # Value is based on the stablecoin side

        event_payload = {
            "id": f"{block_number}-{tx_hash[:6]}",
            "timestamp": datetime.utcnow().isoformat(),
            "chain": contract_info['chain'],
            "eventType": "DEX_SWAP",
            "details": details_str,
            "value": value_str,
            "meta": {
                "contract": contract_info['name'],
                "txHash": tx_hash,
                "block": block_number
            }
        }

        payload_json = json.dumps(event_payload)

        # 1. Push to a list for historical polling by the dashboard
        await redis_client.lpush(REDIS_STREAM_KEY, payload_json)
        await redis_client.ltrim(REDIS_STREAM_KEY, 0, MAX_STREAM_LENGTH - 1)

        # 2. Publish to a channel for real-time pushing via WebSockets
        await redis_client.publish(REDIS_PUBSUB_CHANNEL, payload_json)

        print(f"✅ Event Processed: {details_str} on {contract_info['chain']}")

    except Exception as e:
        print(f"❌ Error processing event: {e}")

async def log_loop(w3, event_filter, poll_interval, redis_client, contract_info):
    """
    Asynchronous loop that polls for new events.
    """
    while True:
        try:
            for event in await event_filter.get_new_entries():
                await handle_event(event, redis_client, contract_info)
            await asyncio.sleep(poll_interval)
        except Exception as e:
            print(f"⚠️ Error in log loop: {e}. Reconnecting in 10s...")
            await asyncio.sleep(10)
            # In a real app, you'd re-initialize the w3 connection and filter here

async def main():
    """
    Main function to set up connections and start the monitoring loop.
    """
    # Setup Redis connection
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)

    # Setup Web3 connection
    w3 = Web3(Web3.WebsocketProvider(RPC_WEBSOCKET_URL))
    if not await w3.is_connected():
        print("FATAL: Could not connect to the blockchain node.")
        return

    # Create tasks for each contract
    tasks = []
    for contract_config in CONTRACTS_TO_MONITOR:
        contract = w3.eth.contract(address=contract_config['address'], abi=contract_config['abi'])
        event_filter = await contract.events.Swap.create_filter(fromBlock='latest')
        tasks.append(log_loop(w3, event_filter, 2, redis_client, contract_config))
        print(f"Started monitoring: {contract_config['name']}")

    # Run all monitoring loops concurrently
    await asyncio.gather(*tasks)

if __name__ == '__main__':
    # Run the main async loop, with retry logic for initial connection
    while True:
        try:
            asyncio.run(main())
        except KeyboardInterrupt:
            print("\n🛑 Monitor stopped by user.")
            break
        except Exception as e:
            print(f"--- CRITICAL ERROR ---")
            print(f"An unrecoverable error occurred: {e}")
            print(f"Restarting in 30 seconds...")
            print("----------------------")
            time.sleep(30)