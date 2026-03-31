import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Set dummy env vars before importing executor
os.environ["PAPER_TRADING_MODE"] = "false"
os.environ["PRIVATE_KEY"] = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
os.environ["PIMLICO_API_KEY"] = "dummy_pimlico"
os.environ["BICONOMY_API_KEY"] = "mee_3ZUAvWL62BBVb2EjVPZwNUaF"
os.environ["FLASHLOAN_CONTRACT_ADDRESS"] = "0x0000000000000000000000000000000000000001"
os.environ["ETH_RPC_URL"] = "https://eth.llamarpc.com"
os.environ["MEV_PROTECTION"] = "false"

# Add paths
PROJECT_ROOT = r"c:\Users\op\Desktop\alphamarkA"
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "execution_bot", "scripts"))

import executor

class TestBiconomyFallback(unittest.TestCase):

    @patch('executor.GLOBAL_SESSION.post')
    @patch('executor.Web3')
    @patch('executor.Account')
    def test_fallback_logic(self, mock_account, mock_web3, mock_post):
        # Mock Account
        mock_acc = MagicMock()
        mock_account.from_key.return_value = mock_acc
        mock_acc.address = "0x748Aa8ee067585F5bd02f0988eF6E71f2d662751"
        mock_acc.signHash.return_value.signature.hex.return_value = "0xsignature"
        
        # Mock Web3
        mock_w3 = MagicMock()
        mock_web3.return_value = mock_w3
        mock_w3.is_connected.return_value = True
        mock_w3.eth.chain_id = 1
        mock_w3.eth.gas_price = 20000000000
        mock_w3.eth.get_block.return_value = {'baseFeePerGas': 10000000000, 'number': 12345}
        mock_w3.eth.get_code.return_value = b'deployed_code'
        mock_w3.eth.get_transaction_count.return_value = 0
        mock_w3.keccak.side_effect = lambda x=None, text=None: b'0xhash' if x else b'0xtext'
        
        # Mock opportunity
        opportunity = {
            "chain": "ethereum",
            "base_token_address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            "loan_amount": 1.0,
            "expected_amount_out": 1050000000000000000,
            "path": ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
            "router_address": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        }

        # First call: Pimlico Paymaster (Fails)
        p_pm_resp = MagicMock()
        p_pm_resp.json.return_value = {"error": {"message": "Pimlico out of credits"}}
        p_pm_resp.status_code = 200
        p_pm_resp.raise_for_status.return_value = None
        
        # Second call: Biconomy Paymaster (Succeeds)
        b_pm_resp = MagicMock()
        b_pm_resp.json.return_value = {
            "result": {
                "paymasterAndData": "0x1234",
                "callGasLimit": "0x1",
                "verificationGasLimit": "0x1",
                "preVerificationGas": "0x1"
            }
        }
        b_pm_resp.status_code = 200
        b_pm_resp.raise_for_status.return_value = None

        # Third call: Biconomy Bundler (Succeeds)
        b_bd_resp = MagicMock()
        b_bd_resp.json.return_value = {"result": "0xop_hash"}
        b_bd_resp.status_code = 200
        b_bd_resp.raise_for_status.return_value = None

        mock_post.side_effect = [p_pm_resp, b_pm_resp, b_bd_resp]

        with patch('executor.get_flashloan_address', return_value="0x0000000000000000000000000000000000000001"):
            with patch('executor.get_user_op_hash', return_value=b'hash'):
                with patch('executor.encode', return_value=b'encoded'):
                    success, result = executor.execute_flashloan(opportunity)

        # Assertions
        self.assertTrue(success)
        self.assertEqual(mock_post.call_count, 3)
        
        # Check Biconomy Bundler call URL
        b_bundler_url = "https://bundler.biconomy.io/api/v2/1/mee_3ZUAvWL62BBVb2EjVPZwNUaF"
        self.assertEqual(mock_post.call_args_list[2][0][0], b_bundler_url)
        
        print("\n✅ Fallback and Bundler Switching test passed: Pimlico failed, Biconomy took over, and Bundler URL was correctly switched.")

if __name__ == "__main__":
    unittest.main()