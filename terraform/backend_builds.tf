# Alpha-Orion Backend CI/CD Configuration
# Cloud Build triggers for backend services

# Trigger for User API Service
resource "google_cloudbuild_trigger" "user_api_build" {
  name        = "user-api-build-trigger"
  description = "Build and push User API Service on push to main"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^main$"
    }
  }

  included_files = ["user-api-service/**"]

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "us-central1-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/user-api-service:latest",
        "."
      ]
      dir = "user-api-service"
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "us-central1-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/user-api-service:latest"]
    }
  }
}

# Trigger for Brain Orchestrator (GKE)
resource "google_cloudbuild_trigger" "brain_orchestrator_build" {
  name        = "brain-orchestrator-build-trigger"
  description = "Build and push Brain Orchestrator on push to main"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^main$"
    }
  }

  included_files = ["brain-orchestrator/**"]

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["build", "-t", "us-central1-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/brain-orchestrator:latest", "."]
      dir  = "brain-orchestrator"
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = ["push", "us-central1-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/brain-orchestrator:latest"]
    }
  }
}