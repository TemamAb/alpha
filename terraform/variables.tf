# Alpha-Orion Variables Configuration
# Variables required for the Terraform configuration

variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "alpha-orion"
}

variable "artifact_registry_repo" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "alpha-orion-repo"
}

variable "market-data-lake_location" {
  description = "GCS bucket location for market data lake"
  type        = string
  default     = "US"
}

variable "apphub_project_id" {
  description = "App Hub project ID"
  type        = string
  default     = "alpha-orion"
}

variable "apphub_location" {
  description = "App Hub location"
  type        = string
  default     = "us-central1"
}

variable "apphub_application_id" {
  description = "App Hub application ID"
  type        = string
  default     = "alpha-orion-app"
}

variable "image_versions" {
  description = "Map of service names to their image versions"
  type        = map(string)
  default     = {}
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

# Secrets Variables
variable "ethereum_rpc_key" {
  description = "Ethereum RPC API Key"
  type        = string
  sensitive   = true
}

variable "arbitrum_rpc_key" {
  description = "Arbitrum RPC API Key"
  type        = string
  sensitive   = true
}

variable "polygon_rpc_key" {
  description = "Polygon RPC API Key"
  type        = string
  sensitive   = true
}

variable "polygon_zkevm_rpc_key" {
  description = "Polygon zkEVM RPC API Key"
  type        = string
  sensitive   = true
}

variable "optimism_rpc_key" {
  description = "Optimism RPC API Key"
  type        = string
  sensitive   = true
}

variable "etherscan_api_key" {
  description = "Etherscan API Key"
  type        = string
  sensitive   = true
}

variable "arbiscan_api_key" {
  description = "Arbiscan API Key"
  type        = string
  sensitive   = true
}

variable "polygonscan_api_key" {
  description = "Polygonscan API Key"
  type        = string
  sensitive   = true
}

variable "polygon_zkevm_scan_api_key" {
  description = "Polygon zkEVM Scan API Key"
  type        = string
  sensitive   = true
}

variable "optimism_scan_api_key" {
  description = "Optimism Scan API Key"
  type        = string
  sensitive   = true
}

variable "chainalysis_api_key" {
  description = "Chainalysis API Key"
  type        = string
  sensitive   = true
}

variable "the_graph_api_key" {
  description = "The Graph API Key"
  type        = string
  sensitive   = true
}

variable "deployer_private_key" {
  description = "Deployer Wallet Private Key"
  type        = string
  sensitive   = true
}

variable "pimlico_paymaster_address" {
  description = "Pimlico Paymaster Address"
  type        = string
  sensitive   = true
}

variable "fee_recipient_address" {
  description = "Fee Recipient Address"
  type        = string
  sensitive   = true
}

variable "alloydb_password" {
  description = "AlloyDB Password"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis Password"
  type        = string
  sensitive   = true
}

variable "monitoring_admin_password" {
  description = "Monitoring Admin Password"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack Webhook URL"
  type        = string
  sensitive   = true
}

variable "pagerduty_integration_key" {
  description = "PagerDuty Integration Key"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API Key"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API Key"
  type        = string
  sensitive   = true
}

variable "gcp_service_account_key" {
  description = "GCP Service Account Key"
  type        = string
  sensitive   = true
}

# Frontend Variables
variable "frontend_domain" { type = string }
variable "firebase_site_id" { type = string }
variable "firebase_app_id" { type = string }
variable "github_owner" { type = string }
variable "github_repo" { type = string }
variable "cdn_signed_url_key" {
  type      = string
  sensitive = true
}
variable "notification_channel_id" { type = string }

variable "deployer_ip_range" {
  description = "IP range of the machine deploying Terraform (for GKE access)"
  type        = string
  default     = "0.0.0.0/0"
}
