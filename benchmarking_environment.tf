# Benchmarking Environment Configuration
# Mirrors the Alpha-Orion Production Stack for isolated performance testing
# Based on enterprise-infrastructure-analysis.md

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.50.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "GCP Project ID for the benchmarking environment"
  type        = string
}

variable "region" {
  description = "GCP Region for deployment"
  type        = string
  default     = "us-central1"
}

# ==============================================================================
# 1. ISOLATED NETWORK FOUNDATION
# Mirrors the low-latency production network
# ==============================================================================

module "benchmarking_vpc" {
  source       = "terraform-google-modules/network/google"
  version      = "~> 7.0"
  project_id   = var.project_id
  network_name = "benchmarking-vpc"
  
  subnets = [
    {
      subnet_name   = "benchmarking-subnet-primary"
      subnet_ip     = "10.100.0.0/24"
      subnet_region = var.region
    }
  ]
}

# Firewall rules for benchmarking access
resource "google_compute_firewall" "benchmarking_allow_internal" {
  name    = "benchmarking-allow-internal"
  network = module.benchmarking_vpc.network_name
  project = var.project_id

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = ["10.100.0.0/24"]
}

resource "google_compute_firewall" "benchmarking_allow_ssh" {
  name    = "benchmarking-allow-ssh"
  network = module.benchmarking_vpc.network_name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"] # Restrict in real usage
}

# ==============================================================================
# 2. HIGH-PERFORMANCE COMPUTE (BARE METAL MIRROR)
# Target: <50ms execution latency
# ==============================================================================

resource "google_compute_instance" "benchmarking_node" {
  name         = "benchmarking-execution-node"
  machine_type = "n2-standard-32" # Matches production spec
  zone         = "${var.region}-a"
  project      = var.project_id

  # Extreme SSD for IOPS benchmarking (120k IOPS target)
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      type  = "pd-extreme"
      size  = 100
    }
  }

  network_interface {
    network    = module.benchmarking_vpc.network_name
    subnetwork = module.benchmarking_vpc.subnets_names[0]
    access_config {
      # Ephemeral IP
    }
  }

  # GPU Acceleration for ML Inference (Sub-10ms target)
  guest_accelerator {
    type  = "nvidia-tesla-t4"
    count = 2
  }

  scheduling {
    on_host_maintenance = "TERMINATE" # Required for GPUs
  }

  labels = {
    environment = "benchmarking"
    component   = "execution-engine"
    benchmark   = "wintermute-latency"
  }
}

# ==============================================================================
# 3. DATA PIPELINE (DATAFLOW + BIGTABLE)
# Target: 100k msg/sec throughput
# ==============================================================================

resource "google_bigtable_instance" "benchmarking_db" {
  name          = "benchmarking-bt-instance"
  project       = var.project_id
  instance_type = "PRODUCTION" 

  cluster {
    cluster_id   = "benchmarking-cluster-1"
    zone         = "${var.region}-a"
    num_nodes    = 3 # Minimum for production performance characteristics
    storage_type = "SSD"
  }
}

resource "google_pubsub_lite_topic" "benchmarking_topic" {
  name    = "benchmarking-market-data"
  project = var.project_id
  zone    = "${var.region}-a"

  partition_config {
    count = 2
    capacity {
      publish_mib_per_sec   = 4
      subscribe_mib_per_sec = 4
    }
  }

  retention_config {
    per_partition_bytes = 32212254720 # 30 GB
  }
}

# ==============================================================================
# 4. AI/ML INFRASTRUCTURE (VERTEX AI)
# Target: Real-time inference
# ==============================================================================

resource "google_vertex_ai_endpoint" "benchmarking_endpoint" {
  name         = "benchmarking-opportunity-predictor"
  display_name = "Benchmarking Predictor"
  location     = var.region
  project      = var.project_id
  
  labels = {
    env = "benchmarking"
  }
}

# ==============================================================================
# 5. BENCHMARKING HARNESS (LOAD GENERATOR)
# Simulates market data feed and traffic
# ==============================================================================

resource "google_compute_instance" "load_generator" {
  name         = "benchmarking-load-generator"
  machine_type = "n2-standard-8"
  zone         = "${var.region}-b" # Different zone to simulate network traversal
  project      = var.project_id

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network    = module.benchmarking_vpc.network_name
    subnetwork = module.benchmarking_vpc.subnets_names[0]
  }

  labels = {
    environment = "benchmarking"
    component   = "load-generator"
  }
}

# ==============================================================================
# OUTPUTS
# ==============================================================================

output "benchmarking_node_ip" {
  description = "IP address of the execution node for SSH access"
  value       = google_compute_instance.benchmarking_node.network_interface.0.access_config.0.nat_ip
}

output "bigtable_instance_id" {
  description = "Bigtable instance ID for configuration"
  value       = google_bigtable_instance.benchmarking_db.name
}