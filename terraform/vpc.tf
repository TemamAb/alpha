# Alpha-Orion VPC Configuration
# Optimized for low-latency arbitrage operations

# Main VPC Network
resource "google_compute_network" "arbitrage_vpc" {
  name                    = "arbitrage-network"
  auto_create_subnetworks = false
  routing_mode           = "GLOBAL"
  description            = "VPC network for Alpha-Orion arbitrage platform"
}

# Subnets for different regions
resource "google_compute_subnetwork" "us_central1_subnet" {
  name          = "arbitrage-us-central1"
  ip_cidr_range = "10.0.0.0/16"
  region        = "us-central1"
  network       = google_compute_network.arbitrage_vpc.id

  # Enable flow logs for performance monitoring
  log_config {
    aggregation_interval = "INTERVAL_1_MIN"
    flow_sampling        = 1.0
    metadata             = "INCLUDE_ALL_METADATA"
  }

  # Private Google access for Cloud SQL and Redis
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.10.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.11.0.0/16"
  }
}

resource "google_compute_subnetwork" "europe_west1_subnet" {
  name          = "arbitrage-europe-west1"
  ip_cidr_range = "10.1.0.0/16"
  region        = "europe-west1"
  network       = google_compute_network.arbitrage_vpc.id

  log_config {
    aggregation_interval = "INTERVAL_1_MIN"
    flow_sampling        = 1.0
    metadata             = "INCLUDE_ALL_METADATA"
  }

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.12.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.13.0.0/16"
  }
}

# Cloud Router for Cloud NAT (required for private GKE clusters)
resource "google_compute_router" "arbitrage_router_us" {
  name    = "arbitrage-router-us"
  region  = "us-central1"
  network = google_compute_network.arbitrage_vpc.id
}

resource "google_compute_router" "arbitrage_router_eu" {
  name    = "arbitrage-router-eu"
  region  = "europe-west1"
  network = google_compute_network.arbitrage_vpc.id
}

# Cloud NAT for outbound internet access from private clusters
resource "google_compute_router_nat" "arbitrage_nat_us" {
  name                               = "arbitrage-nat-us"
  router                             = google_compute_router.arbitrage_router_us.name
  region                             = "us-central1"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ALL"
  }
}

resource "google_compute_router_nat" "arbitrage_nat_eu" {
  name                               = "arbitrage-nat-eu"
  router                             = google_compute_router.arbitrage_router_eu.name
  region                             = "europe-west1"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ALL"
  }
}

# Firewall rules
resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  network = google_compute_network.arbitrage_vpc.id

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/8"]
  description   = "Allow all internal traffic within VPC"
}

resource "google_compute_firewall" "allow_health_checks" {
  name    = "allow-health-checks"
  network = google_compute_network.arbitrage_vpc.id

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]  # Google health check ranges
  description   = "Allow Google health checks"
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh"
  network = google_compute_network.arbitrage_vpc.id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]  # IAP IP range
  description   = "Allow SSH through IAP"
}

# Private Service Access for Cloud SQL and Redis
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "arbitrage-private-ip-alloc"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.arbitrage_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.arbitrage_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
}

# VPC peering for Redis
resource "google_redis_instance" "arbitrage_redis" {
  name           = "arbitrage-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 16

  region = "us-central1"

  # Connect to VPC
  authorized_network = google_compute_network.arbitrage_vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_version = "REDIS_7_0"
  display_name  = "Arbitrage Redis Cache"

  # High availability
  replica_count = 2
  read_replicas_mode = "READ_REPLICAS_ENABLED"

  # Maintenance
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# Serverless VPC Access Connector
# Required for Cloud Run services to access Private IP Cloud SQL and Redis
resource "google_vpc_access_connector" "main_connector" {
  name          = "main-vpc-connector"
  region        = "us-central1"
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.arbitrage_vpc.id
  machine_type  = "e2-micro"
}

# Outputs
output "vpc_id" {
  description = "VPC network ID"
  value       = google_compute_network.arbitrage_vpc.id
}

output "us_subnet_id" {
  description = "US Central1 subnet ID"
  value       = google_compute_subnetwork.us_central1_subnet.id
}

output "eu_subnet_id" {
  description = "EU West1 subnet ID"
  value       = google_compute_subnetwork.europe_west1_subnet.id
}

output "redis_host" {
  description = "Redis instance host"
  value       = google_redis_instance.arbitrage_redis.host
}
