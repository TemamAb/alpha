# Alpha-Orion GKE Clusters Configuration
# High-performance Kubernetes clusters for arbitrage services

# GKE Cluster for US Region
resource "google_container_cluster" "arbitrage_us_cluster" {
  name     = "arbitrage-us-cluster"
  location = "us-central1"

  # Disable Autopilot to allow custom node pools (GPU)
  enable_autopilot = false

  network    = google_compute_network.arbitrage_vpc.id
  subnetwork = google_compute_subnetwork.us_central1_subnet.id

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Master authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "10.0.0.0/8"
      display_name = "VPC Internal"
    }
    cidr_blocks {
      cidr_block   = var.deployer_ip_range
      display_name = "Deployer"
    }
  }

  # Security
  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.gke_key.id
  }

  # Workload identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Binary authorization
  binary_authorization {
    evaluation_mode = "ENABLED"
  }

  # Maintenance window
  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T03:00:00Z"
      end_time   = "2024-01-01T06:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU"
    }
  }

  # Monitoring and logging
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Add-ons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    gcp_filestore_csi_driver_config {
      enabled = true
    }
  }

  # Resource usage export to BigQuery
  resource_usage_export_config {
    enable_network_egress_metering = true
    enable_resource_consumption_metering = true

    bigquery_destination {
      dataset_id = "gke_resource_usage"
    }
  }

  # Remove default node pool (using Autopilot)
  remove_default_node_pool = true
  initial_node_count       = 1

  # IP allocation policy
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Cluster Autoscaling (Node Auto Provisioning)
  cluster_autoscaling {
    enabled = true
    resource_limits {
      resource_type = "cpu"
      minimum       = 10
      maximum       = 100
    }
    resource_limits {
      resource_type = "memory"
      minimum       = 40
      maximum       = 400
    }
    resource_limits {
      resource_type = "nvidia-tesla-t4"
      minimum       = 0
      maximum       = 8
    }
    autoscaling_profile = "OPTIMIZE_UTILIZATION"
  }

  depends_on = [
    google_compute_network.arbitrage_vpc,
    google_compute_subnetwork.us_central1_subnet
  ]
}

# GKE Cluster for EU Region
resource "google_container_cluster" "arbitrage_eu_cluster" {
  name     = "arbitrage-eu-cluster"
  location = "europe-west1"

  # Disable Autopilot for consistency and custom config
  enable_autopilot = false

  network    = google_compute_network.arbitrage_vpc.id
  subnetwork = google_compute_subnetwork.europe_west1_subnet.id

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.16/28"
  }

  # Master authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "10.0.0.0/8"
      display_name = "VPC Internal"
    }
    cidr_blocks {
      cidr_block   = var.deployer_ip_range
      display_name = "Deployer"
    }
  }

  # Security
  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.gke_key_eu.id
  }

  # Workload identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Binary authorization
  binary_authorization {
    evaluation_mode = "ENABLED"
  }

  # Maintenance window
  maintenance_policy {
    recurring_window {
      start_time = "2024-01-01T03:00:00Z"
      end_time   = "2024-01-01T06:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU"
    }
  }

  # Monitoring and logging
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Add-ons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    gcp_filestore_csi_driver_config {
      enabled = true
    }
  }

  # Resource usage export to BigQuery
  resource_usage_export_config {
    enable_network_egress_metering = true
    enable_resource_consumption_metering = true

    bigquery_destination {
      dataset_id = "gke_resource_usage_eu"
    }
  }

  # Remove default node pool (using Autopilot)
  remove_default_node_pool = true
  initial_node_count       = 1

  # IP allocation policy
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  depends_on = [
    google_compute_network.arbitrage_vpc,
    google_compute_subnetwork.europe_west1_subnet
  ]
}

# KMS Key for GKE encryption
resource "google_kms_crypto_key" "gke_key" {
  name     = "gke-encryption-key"
  key_ring = google_kms_key_ring.arbitrage_keyring.id
}

resource "google_kms_crypto_key" "gke_key_eu" {
  name     = "gke-encryption-key-eu"
  key_ring = google_kms_key_ring.arbitrage_keyring_eu.id
}

resource "google_kms_key_ring" "arbitrage_keyring" {
  name     = "arbitrage-keyring"
  location = "us-central1"
}

resource "google_kms_key_ring" "arbitrage_keyring_eu" {
  name     = "arbitrage-keyring-eu"
  location = "europe-west1"
}

# Kubernetes Namespace
resource "kubernetes_namespace" "arbitrage" {
  metadata {
    name = "arbitrage"
  }
}

# Kubernetes Namespace (EU)
resource "kubernetes_namespace" "arbitrage_eu" {
  provider = kubernetes.eu
  metadata {
    name = "arbitrage"
  }
}

# HPA Configuration for arbitrage services
resource "kubernetes_horizontal_pod_autoscaler" "brain_orchestrator_hpa" {
  metadata {
    name      = "brain-orchestrator-hpa"
    namespace = kubernetes_namespace.arbitrage.metadata[0].name
  }

  spec {
    max_replicas = 20
    min_replicas = 2

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.brain_orchestrator.metadata[0].name
    }

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type               = "Utilization"
          average_utilization = 70
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type               = "Utilization"
          average_utilization = 80
        }
      }
    }

    # Custom metric for arbitrage queue depth
    metric {
      type = "Pods"
      pods {
        metric {
          name = "arbitrage_queue_depth"
        }
        target {
          type               = "AverageValue"
          average_value = "10"
        }
      }
    }
  }
}

# Node pool for GPU workloads
resource "google_container_node_pool" "gpu_node_pool" {
  name       = "gpu-node-pool"
  location   = "us-central1"
  node_locations = ["us-central1-a", "us-central1-b"]
  cluster    = google_container_cluster.arbitrage_us_cluster.name

  initial_node_count = 1

  node_config {
    machine_type = "n1-standard-8"

    # GPU configuration
    guest_accelerator {
      type  = "nvidia-tesla-t4"
      count = 1
    }

    # Enable GPU driver installation
    metadata = {
      disable-legacy-endpoints = "true"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only",
    ]

    # Workload identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Security
    shielded_instance_config {
      enable_secure_boot          = true
      enable_vtpm                 = true
      enable_integrity_monitoring = true
    }
  }

  # Autoscaling
  autoscaling {
    min_node_count = 0
    max_node_count = 4
  }

  # Management
  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Node pool for EU workloads (Standard)
resource "google_container_node_pool" "eu_node_pool" {
  name       = "eu-node-pool"
  location   = "europe-west1"
  cluster    = google_container_cluster.arbitrage_eu_cluster.name

  initial_node_count = 1

  node_config {
    machine_type = "e2-standard-4"

    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only",
    ]

    # Workload identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 5
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Outputs
output "us_cluster_name" {
  description = "US GKE cluster name"
  value       = google_container_cluster.arbitrage_us_cluster.name
}

output "eu_cluster_name" {
  description = "EU GKE cluster name"
  value       = google_container_cluster.arbitrage_eu_cluster.name
}

output "us_cluster_endpoint" {
  description = "US GKE cluster endpoint"
  value       = google_container_cluster.arbitrage_us_cluster.endpoint
  sensitive   = true
}

output "eu_cluster_endpoint" {
  description = "EU GKE cluster endpoint"
  value       = google_container_cluster.arbitrage_eu_cluster.endpoint
  sensitive   = true
}

# BigQuery Dataset for GKE Usage Metering
resource "google_bigquery_dataset" "gke_usage" {
  dataset_id                  = "gke_resource_usage"
  friendly_name               = "GKE Resource Usage"
  description                 = "GKE Resource Usage Metering Dataset for Arbitrage Clusters"
  location                    = "US"
}

# BigQuery Dataset for GKE Usage Metering (EU)
resource "google_bigquery_dataset" "gke_usage_eu" {
  dataset_id                  = "gke_resource_usage_eu"
  friendly_name               = "GKE Resource Usage EU"
  description                 = "GKE Resource Usage Metering Dataset for Arbitrage Clusters (EU)"
  location                    = "EU"
}
