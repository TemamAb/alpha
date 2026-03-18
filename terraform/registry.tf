# Alpha-Orion Artifact Registry
# Stores container images for GKE and Cloud Run

resource "google_artifact_registry_repository" "repo" {
  location      = "us-central1"
  repository_id = var.artifact_registry_repo
  description   = "Docker repository for Alpha-Orion services"
  format        = "DOCKER"
}