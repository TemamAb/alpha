# Alpha-Orion Cloud SQL Configuration
# PostgreSQL database for arbitrage platform

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "arbitrage_db" {
  name             = "arbitrage-db-instance"
  region           = "us-central1"
  database_version = "POSTGRES_15"

  # High availability configuration
  settings {
    tier = "db-custom-8-32768"  # 8 vCPUs, 32GB RAM

    # High availability
    availability_type = "REGIONAL"

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      location                       = "us-central1"
      transaction_log_retention_days = 7
      retained_backups               = 30

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3  # 3 AM
      update_track = "stable"
    }

    # Disk configuration
    disk_type       = "PD_SSD"
    disk_size       = 500  # 500GB initial size
    disk_autoresize = true
    disk_autoresize_limit = 2000  # Max 2TB

    # Database flags for performance
    database_flags {
      name  = "max_connections"
      value = "1000"
    }

    database_flags {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements,pg_buffercache"
    }

    database_flags {
      name  = "pg_stat_statements.track"
      value = "all"
    }

    database_flags {
      name  = "pg_stat_statements.max"
      value = "10000"
    }

    database_flags {
      name  = "work_mem"
      value = "64MB"
    }

    database_flags {
      name  = "maintenance_work_mem"
      value = "512MB"
    }

    database_flags {
      name  = "checkpoint_completion_target"
      value = "0.9"
    }

    database_flags {
      name  = "wal_buffers"
      value = "16MB"
    }

    database_flags {
      name  = "default_statistics_target"
      value = "100"
    }

    # IP configuration - private only
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.arbitrage_vpc.id
      require_ssl     = true
    }

    # Insights configuration for performance monitoring
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }
  }

  # Encryption
  encryption_key_name = google_kms_crypto_key.sql_key.id

  depends_on = [
    google_compute_network.arbitrage_vpc,
    google_service_networking_connection.private_vpc_connection
  ]
}

# Database user
resource "google_sql_user" "arbitrage_user" {
  name     = "arbitrage_user"
  instance = google_sql_database_instance.arbitrage_db.name
  password = random_password.db_password.result
}

# Random password for database user
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store password in Secret Manager
resource "google_secret_manager_secret" "db_password_secret" {
  secret_id = "db-password"
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password_secret.id
  secret_data = random_password.db_password.result
}

# Main database
resource "google_sql_database" "arbitrage_database" {
  name     = "arbitrage_db"
  instance = google_sql_database_instance.arbitrage_db.name
  charset  = "UTF8"
  collation = "en_US.UTF8"
}

# Additional databases for different services
resource "google_sql_database" "compliance_db" {
  name     = "compliance_db"
  instance = google_sql_database_instance.arbitrage_db.name
  charset  = "UTF8"
  collation = "en_US.UTF8"
}

resource "google_sql_database" "analytics_db" {
  name     = "analytics_db"
  instance = google_sql_database_instance.arbitrage_db.name
  charset  = "UTF8"
  collation = "en_US.UTF8"
}

# KMS key for database encryption
resource "google_kms_crypto_key" "sql_key" {
  name     = "sql-encryption-key"
  key_ring = google_kms_key_ring.arbitrage_keyring.id
}

resource "google_kms_crypto_key" "sql_key_replica" {
  name     = "sql-encryption-key-replica"
  key_ring = google_kms_key_ring.arbitrage_keyring_replica.id
}

resource "google_kms_key_ring" "arbitrage_keyring_replica" {
  name     = "arbitrage-keyring-replica"
  location = "us-east4"
}

# Read replica for high availability
resource "google_sql_database_instance" "arbitrage_db_replica" {
  name                 = "arbitrage-db-replica"
  region               = "us-east4"  # Cross-region replica
  database_version     = "POSTGRES_15"
  master_instance_name = google_sql_database_instance.arbitrage_db.name

  settings {
    tier = "db-custom-4-16384"  # Smaller replica

    # Replica configuration
    availability_type = "ZONAL"

    # Disk configuration
    disk_type       = "PD_SSD"
    disk_size       = 500
    disk_autoresize = true
    disk_autoresize_limit = 2000

    # IP configuration
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.arbitrage_vpc.id
      require_ssl     = true
    }
  }

  # Encryption
  encryption_key_name = google_kms_crypto_key.sql_key_replica.id

  depends_on = [google_sql_database_instance.arbitrage_db]
}

# Cloud SQL Auth proxy service account
resource "google_service_account" "cloudsql_proxy" {
  account_id   = "cloudsql-proxy"
  display_name = "Cloud SQL Auth Proxy Service Account"
}

resource "google_project_iam_member" "cloudsql_proxy_role" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudsql_proxy.email}"
}

# Outputs
output "db_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.arbitrage_db.name
}

output "db_private_ip" {
  description = "Cloud SQL private IP address"
  value       = google_sql_database_instance.arbitrage_db.private_ip_address
}

output "db_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.arbitrage_db.connection_name
}

output "db_user" {
  description = "Database username"
  value       = google_sql_user.arbitrage_user.name
}

output "db_password_secret" {
  description = "Secret Manager secret containing DB password"
  value       = google_secret_manager_secret.db_password_secret.secret_id
  sensitive   = true
}
