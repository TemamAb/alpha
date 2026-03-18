# Alpha-Orion Secret Management Configuration
# GCP Secret Manager for secure credential storage

# Secret Manager Secrets for API Keys and Credentials

# Blockchain RPC API Keys
resource "google_secret_manager_secret" "ethereum_rpc_key" {
  secret_id = "ethereum-rpc-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "ethereum_rpc_key_version" {
  secret      = google_secret_manager_secret.ethereum_rpc_key.id
  secret_data = var.ethereum_rpc_key
}

resource "google_secret_manager_secret" "arbitrum_rpc_key" {
  secret_id = "arbitrum-rpc-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "arbitrum_rpc_key_version" {
  secret      = google_secret_manager_secret.arbitrum_rpc_key.id
  secret_data = var.arbitrum_rpc_key
}

resource "google_secret_manager_secret" "polygon_rpc_key" {
  secret_id = "polygon-rpc-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "polygon_rpc_key_version" {
  secret      = google_secret_manager_secret.polygon_rpc_key.id
  secret_data = var.polygon_rpc_key
}

resource "google_secret_manager_secret" "polygon_zkevm_rpc_key" {
  secret_id = "polygon-zkevm-rpc-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "polygon_zkevm_rpc_key_version" {
  secret      = google_secret_manager_secret.polygon_zkevm_rpc_key.id
  secret_data = var.polygon_zkevm_rpc_key
}

resource "google_secret_manager_secret" "optimism_rpc_key" {
  secret_id = "optimism-rpc-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "optimism_rpc_key_version" {
  secret      = google_secret_manager_secret.optimism_rpc_key.id
  secret_data = var.optimism_rpc_key
}

# Blockchain Explorer API Keys
resource "google_secret_manager_secret" "etherscan_api_key" {
  secret_id = "etherscan-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "etherscan_api_key_version" {
  secret      = google_secret_manager_secret.etherscan_api_key.id
  secret_data = var.etherscan_api_key
}

resource "google_secret_manager_secret" "arbiscan_api_key" {
  secret_id = "arbiscan-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "arbiscan_api_key_version" {
  secret      = google_secret_manager_secret.arbiscan_api_key.id
  secret_data = var.arbiscan_api_key
}

resource "google_secret_manager_secret" "polygonscan_api_key" {
  secret_id = "polygonscan-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "polygonscan_api_key_version" {
  secret      = google_secret_manager_secret.polygonscan_api_key.id
  secret_data = var.polygonscan_api_key
}

resource "google_secret_manager_secret" "polygon_zkevm_scan_api_key" {
  secret_id = "polygon-zkevm-scan-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "polygon_zkevm_scan_api_key_version" {
  secret      = google_secret_manager_secret.polygon_zkevm_scan_api_key.id
  secret_data = var.polygon_zkevm_scan_api_key
}

resource "google_secret_manager_secret" "optimism_scan_api_key" {
  secret_id = "optimism-scan-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "optimism_scan_api_key_version" {
  secret      = google_secret_manager_secret.optimism_scan_api_key.id
  secret_data = var.optimism_scan_api_key
}

# DeFi Protocol API Keys
resource "google_secret_manager_secret" "chainalysis_api_key" {
  secret_id = "chainalysis-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "chainalysis_api_key_version" {
  secret      = google_secret_manager_secret.chainalysis_api_key.id
  secret_data = var.chainalysis_api_key
}

resource "google_secret_manager_secret" "the_graph_api_key" {
  secret_id = "the-graph-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "the_graph_api_key_version" {
  secret      = google_secret_manager_secret.the_graph_api_key.id
  secret_data = var.the_graph_api_key
}

# Wallet and Private Keys
resource "google_secret_manager_secret" "deployer_private_key" {
  secret_id = "deployer-private-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "deployer_private_key_version" {
  secret      = google_secret_manager_secret.deployer_private_key.id
  secret_data = var.deployer_private_key
}

resource "google_secret_manager_secret" "pimlico_paymaster_address" {
  secret_id = "pimlico-paymaster-address"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "pimlico_paymaster_address_version" {
  secret      = google_secret_manager_secret.pimlico_paymaster_address.id
  secret_data = var.pimlico_paymaster_address
}

resource "google_secret_manager_secret" "fee_recipient_address" {
  secret_id = "fee-recipient-address"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "fee_recipient_address_version" {
  secret      = google_secret_manager_secret.fee_recipient_address.id
  secret_data = var.fee_recipient_address
}

# Database Credentials
resource "google_secret_manager_secret" "alloydb_password" {
  secret_id = "alloydb-password"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "alloydb_password_version" {
  secret      = google_secret_manager_secret.alloydb_password.id
  secret_data = var.alloydb_password
}

resource "google_secret_manager_secret" "redis_password" {
  secret_id = "redis-password"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "redis_password_version" {
  secret      = google_secret_manager_secret.redis_password.id
  secret_data = var.redis_password
}

# Monitoring and Alerting
resource "google_secret_manager_secret" "monitoring_admin_password" {
  secret_id = "monitoring-admin-password"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "monitoring_admin_password_version" {
  secret      = google_secret_manager_secret.monitoring_admin_password.id
  secret_data = var.monitoring_admin_password
}

resource "google_secret_manager_secret" "slack_webhook_url" {
  secret_id = "slack-webhook-url"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "slack_webhook_url_version" {
  secret      = google_secret_manager_secret.slack_webhook_url.id
  secret_data = var.slack_webhook_url
}

resource "google_secret_manager_secret" "pagerduty_integration_key" {
  secret_id = "pagerduty-integration-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "pagerduty_integration_key_version" {
  secret      = google_secret_manager_secret.pagerduty_integration_key.id
  secret_data = var.pagerduty_integration_key
}

# External Service Credentials
resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "openai-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "openai_api_key_version" {
  secret      = google_secret_manager_secret.openai_api_key.id
  secret_data = var.openai_api_key
}

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "anthropic-api-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "anthropic_api_key_version" {
  secret      = google_secret_manager_secret.anthropic_api_key.id
  secret_data = var.anthropic_api_key
}

# Service Account Keys (for external integrations)
resource "google_secret_manager_secret" "gcp_service_account_key" {
  secret_id = "gcp-service-account-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "gcp_service_account_key_version" {
  secret      = google_secret_manager_secret.gcp_service_account_key.id
  secret_data = var.gcp_service_account_key
}

# Outputs for reference
output "secret_names" {
  description = "List of all created secrets"
  value = [
    google_secret_manager_secret.ethereum_rpc_key.secret_id,
    google_secret_manager_secret.arbitrum_rpc_key.secret_id,
    google_secret_manager_secret.polygon_rpc_key.secret_id,
    google_secret_manager_secret.polygon_zkevm_rpc_key.secret_id,
    google_secret_manager_secret.optimism_rpc_key.secret_id,
    google_secret_manager_secret.etherscan_api_key.secret_id,
    google_secret_manager_secret.arbiscan_api_key.secret_id,
    google_secret_manager_secret.polygonscan_api_key.secret_id,
    google_secret_manager_secret.polygon_zkevm_scan_api_key.secret_id,
    google_secret_manager_secret.optimism_scan_api_key.secret_id,
    google_secret_manager_secret.chainalysis_api_key.secret_id,
    google_secret_manager_secret.the_graph_api_key.secret_id,
    google_secret_manager_secret.deployer_private_key.secret_id,
    google_secret_manager_secret.pimlico_paymaster_address.secret_id,
    google_secret_manager_secret.fee_recipient_address.secret_id,
    google_secret_manager_secret.alloydb_password.secret_id,
    google_secret_manager_secret.redis_password.secret_id,
    google_secret_manager_secret.monitoring_admin_password.secret_id,
    google_secret_manager_secret.slack_webhook_url.secret_id,
    google_secret_manager_secret.pagerduty_integration_key.secret_id,
    google_secret_manager_secret.openai_api_key.secret_id,
    google_secret_manager_secret.anthropic_api_key.secret_id,
    google_secret_manager_secret.gcp_service_account_key.secret_id,
  ]
}
