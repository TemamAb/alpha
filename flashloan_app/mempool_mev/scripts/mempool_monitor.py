# Monitor mempool
import websocket
import json
import threading
import time
from web3 import Web3
import logging

logger = logging.getLogger(__name__)

# Local WebSocket RPCs - will use local hardhat nodes
RPCS = {
    "ethereum": "ws://127.0.0.1:8546",
    "polygon": "ws://127.0.0.1:8548",
    "bsc": "ws://127.0.0.1:8550"
}

class MempoolMonitor:
    def __init__(self, chain):
        self.chain = chain
        self.wss_url = RPCS.get(chain, RPCS["ethereum"])
        self.opportunities = []
        self.lock = threading.Lock()
        self.w3 = Web3(Web3.WebsocketProvider(self.wss_url))
        
    def on_message(self, ws, message):
        try:
            tx_data = json.loads(message)
            if 'params' in tx_data and 'result' in tx_data['params']:
                tx_hash = tx_data['params']['result']
                # Fetch tx details
                receipt = self.w3.eth.get_transaction(tx_hash)
                # Decode for arb patterns (to DEX routers with flashloan amounts)
                if self.is_arbitrage_tx(receipt):
                    opp = self.extract_opportunity(receipt)
                    with self.lock:
                        self.opportunities.append(opp)
        except Exception as e:
            logger.error(f"Mempool parse error: {e}")
    
    def is_arbitrage_tx(self, tx):
        # Heuristic: large flashloan calls to Aave + DEX swaps
        input_data = tx['input']
        if len(input_data) > 100 and b'flashLoan' in bytes.fromhex(input_data[10:]):
            return True
        return False
    
    def extract_opportunity(self, tx):
        # Extract token/amounts from input/calldata ABI decode (simplified)
        return {
            'chain': self.chain,
            'token': 'USDC',  # Decode actual
            'buy_dex': tx['to'],  # Simplified
            'sell_dex': '0x...', 
            'profit': 0.05  # Estimate from amounts
        }
    
    def start(self):
        ws = websocket.WebSocketApp(self.wss_url,
                                  on_message=self.on_message,
                                  on_error=lambda ws, err: logger.error(f"WS Error: {err}"),
                                  on_close=lambda ws: logger.warning("Mempool WS closed"))
        ws.run_forever()

def monitor_mempool(chain, callback=None):
    """
    Production mempool monitor using WebSocket.
    callback(opps): called with list of opportunities
    """
    monitor = MempoolMonitor(chain)
    def poll_opps():
        while True:
            with monitor.lock:
                if monitor.opportunities:
                    opps = monitor.opportunities[:]
                    monitor.opportunities.clear()
                    if callback:
                        callback(opps)
            time.sleep(0.1)
    
    polling_thread = threading.Thread(target=poll_opps, daemon=True)
    polling_thread.start()
    
    logger.info(f"Starting mempool monitor for {chain} at {monitor.wss_url}")
    monitor.start()
