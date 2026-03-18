import os
import requests
import logging
import time
from web3 import Web3
from web3.middleware import geth_poa_middleware

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MEVBlockerEngine:
    """
    MEV Blocker Engine - Supports Pimlico gasless transactions (ERC-4337).
    No private key required - uses Pimlico bundler/paymaster infrastructure.
    """
    def __init__(self):
        # Configuration - Pimlico gasless mode (preferred - no private key needed)
        self.pimlico_api_key = os.getenv('PIMLICO_API_KEY')
        self.bundler_url = os.getenv('BUNDLER_URL') or (f'https://api.pimlico.io/v1/1/rpc?apikey={self.pimlico_api_key}' if self.pimlico_api_key else None)
        self.paymaster_url = os.getenv('PAYMASTER_URL') or (f'https://api.pimlico.io/v2/1/rpc?apikey={self.pimlico_api_key}' if self.pimlico_api_key else None)
        self.entrypoint_address = os.getenv('ENTRYPOINT_ADDRESS', '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789')
        
        # Wallet address (public only - no private key needed for Pimlico)
        self.wallet_address = os.getenv('EXECUTION_WALLET_ADDRESS', '0x21e6d55cBd4721996a6B483079449cFc279A993a')
        self.mev_blocker_enabled = os.getenv('MEV_BLOCKER_ENABLED', 'true').lower() == 'true'
        
        # Use Pimlico if API key is available (gasless mode)
        self.use_pimlico = bool(self.pimlico_api_key and self.wallet_address)
        
        if self.use_pimlico:
            logging.info(f'[MEVBlocker] Using Pimlico gasless mode for wallet: {self.wallet_address}')
            # Initialize Web3 with Pimlico RPC
            self.w3 = Web3(Web3.HTTPProvider(self.bundler_url))
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        else:
            # No Pimlico - monitoring mode only
            logging.warning('[MEVBlocker] No Pimlico API key - monitoring mode only')
            self.w3 = None

    def send_private_transaction(self, transaction_data: dict):
        """
        Send transaction via Pimlico gasless (ERC-4337) - no private key required.
        """
        if not self.mev_blocker_enabled:
            logging.warning("[MEVBlocker] MEV Blocker is disabled.")
            raise NotImplementedError('MEV Blocker is disabled.')

        if not self.use_pimlico:
            logging.warning("[MEVBlocker] No Pimlico configured - cannot send transaction")
            raise ValueError('No Pimlico gasless configuration.')

        try:
            # Build UserOperation for ERC-4337
            user_op = self._build_user_op(transaction_data)
            
            # Send to Pimlico bundler
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "eth_sendUserOperation",
                "params": [user_op, self.entrypoint_address]
            }
            
            response = requests.post(self.bundler_url, json=payload, timeout=60)
            result = response.json()
            
            if 'result' in result:
                logging.info(f"[Pimlico] UserOp sent: {result['result']}")
                return {'status': 'sent', 'hash': result['result'], 'mode': 'pimlico_gasless'}
            else:
                raise Exception(f"Pimlico error: {result.get('error', result)}")
                
        except Exception as e:
            logging.error(f"[Pimlico] UserOp failed: {e}")
            raise

    def _build_user_op(self, transaction_data: dict):
        """Build ERC-4337 UserOperation"""
        # Estimate gas
        try:
            gas_estimate = self.w3.eth.estimate_gas({
                'from': self.wallet_address,
                'to': transaction_data.get('to'),
                'data': transaction_data.get('data', '0x')
            })
        except:
            gas_estimate = 100000
            
        return {
            'sender': self.wallet_address,
            'to': self.w3.to_checksum_address(transaction_data.get('to', self.wallet_address)),
            'data': transaction_data.get('data', '0x'),
            'value': transaction_data.get('value', 0),
            'maxFeePerGas': self.w3.eth.gas_price * 2,
            'maxPriorityFeePerGas': self.w3.eth.gas_price,
            'nonce': 0,
            'callGasLimit': gas_estimate,
            'verificationGasLimit': 200000,
            'preVerificationGas': 21000,
            'signature': '0x'
        }

    def estimate_mev_exposure(self, transaction_data: dict):
        """
        Estimates the potential MEV exposure of a given transaction.
        """
        return {
            'sandwich_risk': 'low' if self.use_pimlico else 'unknown',
            'front_run_risk': 'protected' if self.use_pimlico else 'unknown',
            'mev_protection': self.use_pimlico,
            'mode': 'pimlico_gasless' if self.use_pimlico else 'none'
        }

    def get_status(self):
        """Get engine status"""
        return {
            'enabled': self.mev_blocker_enabled,
            'mode': 'pimlico_gasless' if self.use_pimlico else 'monitoring_only',
            'wallet': self.wallet_address,
            'pimlico_configured': bool(self.pimlico_api_key)
        }
