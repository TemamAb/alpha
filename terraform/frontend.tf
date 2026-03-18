# Alpha-Orion Frontend Hosting Configuration
# Firebase Hosting or Cloud Storage + Cloud CDN for React application

# Cloud Storage Bucket for Static Assets
resource "google_storage_bucket" "frontend_assets" {
  name          = "${var.project_id}-frontend-assets"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Cloud Storage Bucket for Frontend Build
resource "google_storage_bucket" "frontend_build" {
  name          = "${var.project_id}-frontend-build-${var.environment}"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

# Cloud CDN Backend Bucket
resource "google_compute_backend_bucket" "frontend_cdn" {
  name        = "frontend-cdn-backend"
  bucket_name = google_storage_bucket.frontend_assets.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }
}

# Cloud CDN URL Map
resource "google_compute_url_map" "frontend_cdn" {
  name            = "frontend-cdn-urlmap"
  default_service = google_compute_backend_bucket.frontend_cdn.id

  host_rule {
    hosts        = [var.frontend_domain]
    path_matcher = "frontend"
  }

  path_matcher {
    name            = "frontend"
    default_service = google_compute_backend_bucket.frontend_cdn.id

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.api_backend.id
    }
  }
}

# Cloud CDN SSL Certificate
resource "google_compute_managed_ssl_certificate" "frontend_ssl" {
  name = "frontend-ssl-cert"

  managed {
    domains = [var.frontend_domain]
  }
}

# Cloud CDN HTTPS Target Proxy
resource "google_compute_target_https_proxy" "frontend_https" {
  name             = "frontend-https-proxy"
  url_map          = google_compute_url_map.frontend_cdn.id
  ssl_certificates = [google_compute_managed_ssl_certificate.frontend_ssl.id]
}

# Cloud CDN Global Address
resource "google_compute_global_address" "frontend_ip" {
  name = "frontend-global-ip"
}

# Cloud CDN Global Forwarding Rule
resource "google_compute_global_forwarding_rule" "frontend_cdn" {
  name       = "frontend-cdn-forwarding-rule"
  target     = google_compute_target_https_proxy.frontend_https.id
  port_range = "443"
  ip_address = google_compute_global_address.frontend_ip.address
}

# API Backend Service (for /api/* routing)
resource "google_compute_backend_service" "api_backend" {
  name                  = "api-backend-service"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30

  health_checks = [google_compute_health_check.api_health.id]

  backend {
    group = google_compute_region_network_endpoint_group.api_neg.id
  }
}

# API Health Check
resource "google_compute_health_check" "api_health" {
  name = "api-health-check"

  http_health_check {
    port               = 80
    port_specification = "USE_FIXED_PORT"
    request_path       = "/health"
  }
}

# Serverless NEG for Cloud Run API Service
resource "google_compute_region_network_endpoint_group" "api_neg" {
  name                  = "api-serverless-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_service.user_api_service.name
  }
}

# Firebase Hosting (Alternative Option)
resource "google_firebase_hosting_site" "frontend" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.firebase_site_id
  app_id   = google_firebase_web_app.frontend.app_id
}

resource "google_firebase_web_app" "frontend" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Alpha-Orion Frontend"
  app_id       = var.firebase_app_id
}

# Cloud Build Trigger for Frontend Deployment
resource "google_cloudbuild_trigger" "frontend_deploy" {
  name        = "frontend-deploy-trigger"
  description = "Deploy frontend to Cloud Storage/CDN on push to main"

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^main$"
    }
  }

  included_files = ["frontend/**"]

  build {
    step {
      name = "gcr.io/cloud-builders/npm"
      args = ["install"]
      dir  = "frontend"
    }

    step {
      name = "gcr.io/cloud-builders/npm"
      args = ["run", "build"]
      dir  = "frontend"
    }

    step {
      name = "gcr.io/cloud-builders/gsutil"
      args = ["-m", "rsync", "-r", "-d", "frontend/build", "gs://${google_storage_bucket.frontend_assets.name}"]
    }

    step {
      name = "gcr.io/cloud-builders/gsutil"
      args = ["iam", "ch", "allUsers:objectViewer", "gs://${google_storage_bucket.frontend_assets.name}/**"]
    }

    step {
      name = "gcr.io/cloud-builders/gsutil"
      args = ["web", "set", "-m", "index.html", "-e", "index.html", "gs://${google_storage_bucket.frontend_assets.name}"]
    }
  }
}

# Cloud Armor Security Policy
resource "google_compute_security_policy" "frontend_security" {
  name = "frontend-security-policy"

  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      expr {
        expression = "request.headers['user-agent'].contains('MaliciousBot')"
      }
    }
    description = "Block malicious bots"
  }

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      expr {
        expression = "true"
      }
    }
    description = "Default allow rule"
  }
}

# Attach Security Policy to CDN
resource "google_compute_backend_bucket_signed_url_key" "frontend_cdn_key" {
  name        = "frontend-cdn-key"
  key_value   = var.cdn_signed_url_key
  backend_bucket = google_compute_backend_bucket.frontend_cdn.name
}

# Monitoring and Alerting
resource "google_monitoring_alert_policy" "frontend_availability" {
  display_name = "Frontend Availability Alert"
  combiner     = "OR"

  conditions {
    display_name = "Frontend HTTP 5xx Error Rate"
    condition_threshold {
      filter          = "metric.type=\"loadbalancing.googleapis.com/https/request_count\" resource.type=\"https_lb_rule\" metric.label.response_code_class=\"500\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [var.notification_channel_id]
}

# Outputs
output "frontend_domain" {
  description = "Frontend domain name"
  value       = var.frontend_domain
}

output "frontend_ip" {
  description = "Frontend global IP address"
  value       = google_compute_global_address.frontend_ip.address
}

output "frontend_bucket_name" {
  description = "Frontend assets bucket name"
  value       = google_storage_bucket.frontend_assets.name
}

output "firebase_site_url" {
  description = "Firebase hosting site URL"
  value       = "https://${google_firebase_hosting_site.frontend.site_id}.web.app"
}
