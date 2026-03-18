# Alpha-Orion Smoke Testing Infrastructure
# End-to-end testing environment for production validation

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
  }
}

# Test Wallet for Smoke Testing
resource "google_secret_manager_secret" "test_wallet_private_key" {
  secret_id = "test-wallet-private-key"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "test_wallet_private_key_version" {
  secret      = google_secret_manager_secret.test_wallet_private_key.id
  secret_data = var.test_wallet_private_key
}

resource "google_secret_manager_secret" "test_wallet_address" {
  secret_id = "test-wallet-address"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "test_wallet_address_version" {
  secret      = google_secret_manager_secret.test_wallet_address.id
  secret_data = var.test_wallet_address
}

# Test Database for Smoke Testing
resource "google_sql_database" "smoke_test_db" {
  name     = "smoke_test"
  instance = google_sql_database_instance.smoke_test_instance.name
}

resource "google_sql_database_instance" "smoke_test_instance" {
  name             = "smoke-test-postgres"
  database_version = "POSTGRES_14"
  region           = var.region

  settings {
    tier = "db-f1-micro"

    disk_size = 10

    backup_configuration {
      enabled = false
    }

    ip_configuration {
      ipv4_enabled = false
      private_network = google_compute_network.vpc.id
    }

    database_flags {
      name  = "max_connections"
      value = "25"
    }
  }

  deletion_protection = false
}

# Test Redis Instance
resource "google_redis_instance" "smoke_test_redis" {
  name           = "smoke-test-redis"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  redis_version = "REDIS_6_X"

  authorized_network = google_compute_network.vpc.id
}

# Test Kubernetes Namespace
resource "kubernetes_namespace" "smoke_test" {
  metadata {
    name = "smoke-test"
    labels = {
      environment = "smoke-test"
      purpose     = "validation"
    }
  }
}

# Test Service Account
resource "google_service_account" "smoke_test_sa" {
  account_id   = "smoke-test-service-account"
  display_name = "Smoke Test Service Account"
  description  = "Service account for smoke testing Alpha-Orion"
}

# IAM Bindings for Test Service Account
resource "google_project_iam_member" "smoke_test_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.smoke_test_sa.email}"
}

resource "google_project_iam_member" "smoke_test_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.smoke_test_sa.email}"
}

resource "google_project_iam_member" "smoke_test_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.smoke_test_sa.email}"
}

# Test Load Balancer for API Testing
resource "google_compute_global_address" "smoke_test_api_ip" {
  name = "smoke-test-api-global-ip"
}

resource "google_compute_backend_service" "smoke_test_api_backend" {
  name                  = "smoke-test-api-backend"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30

  health_checks = [google_compute_health_check.smoke_test_api_health.id]
}

resource "google_compute_health_check" "smoke_test_api_health" {
  name = "smoke-test-api-health-check"

  http_health_check {
    port               = 80
    port_specification = "USE_FIXED_PORT"
    request_path       = "/health"
  }
}

resource "google_compute_url_map" "smoke_test_api" {
  name            = "smoke-test-api-urlmap"
  default_service = google_compute_backend_service.smoke_test_api_backend.id
}

resource "google_compute_target_http_proxy" "smoke_test_api" {
  name    = "smoke-test-api-http-proxy"
  url_map = google_compute_url_map.smoke_test_api.id
}

resource "google_compute_global_forwarding_rule" "smoke_test_api" {
  name       = "smoke-test-api-forwarding-rule"
  target     = google_compute_target_http_proxy.smoke_test_api.id
  port_range = "80"
  ip_address = google_compute_global_address.smoke_test_api_ip.address
}

# Monitoring Dashboard for Smoke Tests
resource "google_monitoring_dashboard" "smoke_test_dashboard" {
  dashboard_json = jsonencode({
    displayName = "Alpha-Orion Smoke Test Dashboard"
    gridLayout = {
      columns = "2"
      widgets = [
        {
          title = "Test Transaction Success Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/smoke_test/transaction_success\" resource.type=\"global\""
                  aggregation = {
                    alignmentPeriod = "60s"
                    crossSeriesReducer = "REDUCE_MEAN"
                    groupByFields = ["resource.label.\"method\""]
                  }
                }
              }
            }]
          }
        },
        {
          title = "Test API Response Time"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/smoke_test/api_response_time\" resource.type=\"global\""
                  aggregation = {
                    alignmentPeriod = "60s"
                    crossSeriesReducer = "REDUCE_PERCENTILE_95"
                  }
                }
              }
            }]
          }
        }
      ]
    }
  })
}

# Alert Policies for Smoke Test Failures
resource "google_monitoring_alert_policy" "smoke_test_failure" {
  display_name = "Smoke Test Transaction Failure"
  combiner     = "OR"

  conditions {
    display_name = "Smoke Test Transaction Failed"
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/smoke_test/transaction_failed\" resource.type=\"global\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_COUNT"
      }
    }
  }

  notification_channels = [var.notification_channel_id]
}

# Outputs
output "smoke_test_namespace" {
  description = "Kubernetes namespace for smoke tests"
  value       = kubernetes_namespace.smoke_test.metadata[0].name
}

output "smoke_test_database" {
  description = "Smoke test database connection"
  value       = google_sql_database_instance.smoke_test_instance.connection_name
}

output "smoke_test_redis" {
  description = "Smoke test Redis host"
  value       = google_redis_instance.smoke_test_redis.host
}

output "smoke_test_api_ip" {
  description = "Smoke test API global IP"
  value       = google_compute_global_address.smoke_test_api_ip.address
}

output "test_wallet_address" {
  description = "Test wallet address for smoke testing"
  value       = google_secret_manager_secret_version.test_wallet_address_version.secret_data
  sensitive   = true
}
