variable "project_id" {
  description = "The GCP project ID."
  type        = string
}
variable "us_region" {
  description = "The primary GCP region for backtesting."
  type        = string
  default     = "us-central1"
}

resource "google_project_service" "gke_api" {
  project = var.project_id
  service = "container.googleapis.com"
  disable_on_destroy = false
}

resource "google_container_cluster" "backtesting_cluster" {
  project  = var.project_id
  name     = "alpha-orion-backtest-gke"
  location = var.us_region

  initial_node_count = 1
  remove_default_node_pool = true # Manage node pools separately for flexibility

  networking_mode = "VPC_NATIVE" # Recommended for modern GKE
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pod-range"
    services_secondary_range_name = "gke-service-range"
  }

  depends_on = [google_project_service.gke_api]
}

resource "google_container_node_pool" "backtesting_node_pool_standard" {
  project  = var.project_id
  location = var.us_region
  cluster  = google_container_cluster.backtesting_cluster.name
  name     = "default-pool"
  node_count = 1 # Start with 1, scale based on needs

  node_config {
    machine_type = "e2-standard-4" # Cost-effective general purpose
    preemptible  = true          # Consider preemptible VMs for cost savings on non-critical tests
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform" # Broad scope for backtesting, refine if needed
    ]
  }
  management {
    auto_repair  = true
    auto_upgrade = true
  }
  autoscaling {
    min_node_count = 1
    max_node_count = 5 # Adjust based on expected load
  }
  depends_on = [google_container_cluster.backtesting_cluster]
}

output "backtesting_gke_cluster_name" {
  value = google_container_cluster.backtesting_cluster.name
}
