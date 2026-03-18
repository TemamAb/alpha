# Alpha-Orion Secret Manager Variables
# Copy this file to secrets.tfvars and fill in your actual values
# DO NOT commit secrets.tfvars to version control

# Blockchain RPC API Keys
ethereum_rpc_key     = "your-ethereum-rpc-key"
arbitrum_rpc_key     = "your-arbitrum-rpc-key"
polygon_rpc_key      = "your-polygon-rpc-key"
polygon_zkevm_rpc_key = "your-polygon-zkevm-rpc-key"
optimism_rpc_key     = "your-optimism-rpc-key"

# Blockchain Explorer API Keys
etherscan_api_key           = "your-etherscan-api-key"
arbiscan_api_key           = "your-arbiscan-api-key"
polygonscan_api_key        = "your-polygonscan-api-key"
polygon_zkevm_scan_api_key = "your-polygon-zkevm-scan-api-key"
optimism_scan_api_key      = "your-optimism-scan-api-key"

# DeFi Protocol API Keys
chainalysis_api_key = "your-chainalysis-api-key"
the_graph_api_key   = "your-the-graph-api-key"

# Wallet and Private Keys
deployer_private_key     = "your-deployer-private-key-without-0x-prefix"
pimlico_paymaster_address = "your-pimlico-paymaster-address"
fee_recipient_address    = "your-fee-recipient-address"

# Database Credentials
alloydb_password = "your-alloydb-password"
redis_password   = "your-redis-password"

# Monitoring and Alerting
monitoring_admin_password = "your-monitoring-admin-password"
slack_webhook_url         = "your-slack-webhook-url"
pagerduty_integration_key = "your-pagerduty-integration-key"

# External Service Credentials
openai_api_key    = "your-openai-api-key"
anthropic_api_key = "your-anthropic-api-key"

# Service Account Keys
gcp_service_account_key = "your-gcp-service-account-key-json"
