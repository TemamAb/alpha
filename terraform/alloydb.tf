# Alpha-Orion AlloyDB PostgreSQL Configuration
# High-performance, fully managed PostgreSQL-compatible database

resource "google_alloydb_cluster" "alpha_orion_primary" {
  cluster_id = "alpha-orion-primary"
  location   = var.region
  project    = var.project_id

  network_config {
    network    = google_compute_network.alpha_orion_vpc.id
    allocated_ip_range = google_compute_global_address.alloydb_private_ip_range.name
  }

  initial_user {
    user     = "alpha_orion_admin"
    password = data.google_secret_manager_secret_version.alloydb_password.secret_data
  }

  automated_backup_policy {
    location      = var.region
    backup_window = "02:00-06:00"  # 2 AM - 6 AM UTC
    enabled       = true

    weekly_schedule {
      days_of_week = ["SUNDAY", "WEDNESDAY"]

      start_times {
        hours   = 2
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }

    retention_count = 7  # Keep 7 backups
  }

  labels = {
    environment = "production"
    service     = "alpha-orion"
    component   = "database"
  }
}

resource "google_alloydb_instance" "alpha_orion_primary_instance" {
  cluster       = google_alloydb_cluster.alpha_orion_primary.name
  instance_id   = "alpha-orion-primary-instance"
  instance_type = "PRIMARY"

  machine_config {
    cpu_count = 8  # 8 vCPUs for high-performance arbitrage operations
  }

  availability_type = "REGIONAL"  # High availability across zones

  gce_zone = "${var.region}-a"

  labels = {
    environment = "production"
    service     = "alpha-orion"
    component   = "database"
    instance_type = "primary"
  }

  depends_on = [google_alloydb_cluster.alpha_orion_primary]
}

resource "google_alloydb_instance" "alpha_orion_read_replica" {
  cluster       = google_alloydb_cluster.alpha_orion_primary.name
  instance_id   = "alpha-orion-read-replica"
  instance_type = "READ_POOL"

  read_pool_config {
    node_count = 2  # 2 read replica nodes
  }

  machine_config {
    cpu_count = 4  # 4 vCPUs for read operations
  }

  availability_type = "REGIONAL"

  gce_zone = "${var.region}-b"

  labels = {
    environment = "production"
    service     = "alpha-orion"
    component   = "database"
    instance_type = "read-replica"
  }

  depends_on = [google_alloydb_instance.alpha_orion_primary_instance]
}

# Private IP range for AlloyDB
resource "google_compute_global_address" "alloydb_private_ip_range" {
  name          = "alloydb-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.alpha_orion_vpc.id
}

# VPC peering for AlloyDB
resource "google_service_networking_connection" "alloydb_vpc_connection" {
  network                 = google_compute_network.alpha_orion_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.alloydb_private_ip_range.name]
}

# Database user for application
resource "google_alloydb_user" "alpha_orion_app_user" {
  cluster   = google_alloydb_cluster.alpha_orion_primary.name
  user_id   = "alpha_orion_app"
  user_type = "ALLOYDB_IAM_USER"

  depends_on = [google_alloydb_instance.alpha_orion_primary_instance]
}

# IAM binding for database access
resource "google_project_iam_member" "alloydb_iam_binding" {
  project = var.project_id
  role    = "roles/alloydb.client"
  member  = "serviceAccount:${google_service_account.alpha_orion_sa.email}"
}

# Database schema initialization
resource "null_resource" "alloydb_schema_init" {
  depends_on = [google_alloydb_instance.alpha_orion_primary_instance]

  provisioner "local-exec" {
    command = <<-EOT
      # Wait for AlloyDB to be ready
      sleep 300

      # Initialize database schema
      PGPASSWORD=${data.google_secret_manager_secret_version.alloydb_password.secret_data} psql \
        -h ${google_alloydb_instance.alpha_orion_primary_instance.ip_address} \
        -U alpha_orion_admin \
        -d postgres \
        -f infrastructure/postgres-sharding.sql
    EOT
  }

  triggers = {
    instance_id = google_alloydb_instance.alpha_orion_primary_instance.instance_id
  }
}
