# Alpha-Orion Provider Configuration
# This file contains the required providers for the entire Terraform configuration

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${google_container_cluster.arbitrage_us_cluster.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.arbitrage_us_cluster.master_auth[0].cluster_ca_certificate)
}

provider "kubernetes" {
  alias                  = "eu"
  host                   = "https://${google_container_cluster.arbitrage_eu_cluster.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.arbitrage_eu_cluster.master_auth[0].cluster_ca_certificate)
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
