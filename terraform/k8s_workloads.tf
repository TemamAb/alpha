# Alpha-Orion Kubernetes Workloads
# Deployments and Services for GKE clusters

resource "kubernetes_deployment" "brain_orchestrator" {
  metadata {
    name      = "brain-orchestrator"
    namespace = kubernetes_namespace.arbitrage.metadata[0].name
    labels = {
      app = "brain-orchestrator"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "brain-orchestrator"
      }
    }

    template {
      metadata {
        labels = {
          app = "brain-orchestrator"
        }
      }

      spec {
        container {
          image = "us-central1-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/brain-orchestrator:latest"
          name  = "brain-orchestrator"
          
          resources {
            limits = {
              cpu    = "1000m"
              memory = "1Gi"
            }
            requests = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }
        }
      }
    }
  }
}