# Alpha-Orion Cloud Run Services
# Serverless container services for API and frontend

# Service Account for User API
resource "google_service_account" "user_api_sa" {
  account_id   = "user-api-sa"
  display_name = "User API Service Account"
}

resource "google_cloud_run_service" "user_api_service" {
  name     = "user-api-service"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.user_api_sa.email
      
      containers {
        image = "us-central1-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/user-api-service:latest"
        
        ports {
          container_port = 8080 # Fixes port configuration issue
        }

        env {
          name  = "DB_HOST"
          value = google_sql_database_instance.arbitrage_db.private_ip_address
        }
        
        env {
          name  = "DB_USER"
          value = google_sql_user.arbitrage_user.name
        }

        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password_secret.secret_id
              key  = "latest"
            }
          }
        }
      }
    }

    metadata {
      annotations = {
        # Connect to VPC to access Cloud SQL
        "run.googleapis.com/vpc-access-connector" = google_vpc_access_connector.main_connector.name
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_secret_manager_secret_iam_member.api_secret_access]
}

# Allow unauthenticated invocations (required for public API behind LB)
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.user_api_service.name
  location = google_cloud_run_service.user_api_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Grant API Service Account access to DB Password Secret
resource "google_secret_manager_secret_iam_member" "api_secret_access" {
  secret_id = google_secret_manager_secret.db_password_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.user_api_sa.email}"
}

# Grant API Service Account access to Cloud SQL Client
resource "google_project_iam_member" "api_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.user_api_sa.email}"
}