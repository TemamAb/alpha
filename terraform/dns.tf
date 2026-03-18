# Alpha-Orion Domain & SSL Configuration
# Cloud DNS and SSL certificate management

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
  }
}

# Cloud DNS Zone
resource "google_dns_managed_zone" "alpha_orion" {
  name        = "alpha-orion-zone"
  dns_name    = "${var.domain_name}."
  description = "DNS zone for Alpha-Orion application"
  visibility  = "public"

  dnssec_config {
    state = "on"
  }

  labels = {
    environment = var.environment
    project     = "alpha-orion"
  }
}

# DNS Records for Frontend
resource "google_dns_record_set" "frontend_a" {
  name         = google_dns_managed_zone.alpha_orion.dns_name
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_compute_global_address.frontend_ip.address]
}

resource "google_dns_record_set" "frontend_aaaa" {
  name         = google_dns_managed_zone.alpha_orion.dns_name
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "AAAA"
  ttl          = 300

  rrdatas = [google_compute_global_address.frontend_ipv6.address]
}

# DNS Records for API Gateway
resource "google_dns_record_set" "api_a" {
  name         = "api.${google_dns_managed_zone.alpha_orion.dns_name}"
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_compute_global_address.api_ip.address]
}

# DNS Records for WebSocket
resource "google_dns_record_set" "ws_cname" {
  name         = "ws.${google_dns_managed_zone.alpha_orion.dns_name}"
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "CNAME"
  ttl          = 300

  rrdatas = [google_dns_record_set.api_a.name]
}

# DNS Records for Monitoring
resource "google_dns_record_set" "monitoring_cname" {
  name         = "monitoring.${google_dns_managed_zone.alpha_orion.dns_name}"
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "CNAME"
  ttl          = 300

  rrdatas = ["c.storage.googleapis.com."]
}

# DNS Records for Status Page
resource "google_dns_record_set" "status_cname" {
  name         = "status.${google_dns_managed_zone.alpha_orion.dns_name}"
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "CNAME"
  ttl          = 300

  rrdatas = ["stats.uptimerobot.com."]
}

# CAA Records for Certificate Authority Authorization
resource "google_dns_record_set" "caa" {
  name         = google_dns_managed_zone.alpha_orion.dns_name
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "CAA"
  ttl          = 300

  rrdatas = [
    "0 issue \"pki.goog\"",
    "0 issue \"letsencrypt.org\"",
    "0 iodef \"mailto:security@alpha-orion.com\""
  ]
}

# SPF Records for Email Security
resource "google_dns_record_set" "spf" {
  name         = google_dns_managed_zone.alpha_orion.dns_name
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "TXT"
  ttl          = 300

  rrdatas = ["\"v=spf1 include:_spf.google.com ~all\""]
}

# DKIM Records for Email Authentication
resource "google_dns_record_set" "dkim" {
  name         = "google._domainkey.${google_dns_managed_zone.alpha_orion.dns_name}"
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "TXT"
  ttl          = 300

  rrdatas = [var.dkim_record_value]
}

# DMARC Records for Email Security
resource "google_dns_record_set" "dmarc" {
  name         = "_dmarc.${google_dns_managed_zone.alpha_orion.dns_name}"
  managed_zone = google_dns_managed_zone.alpha_orion.name
  type         = "TXT"
  ttl          = 300

  rrdatas = ["\"v=DMARC1; p=quarantine; rua=mailto:dmarc@alpha-orion.com; ruf=mailto:dmarc@alpha-orion.com; fo=1\""]
}

# SSL Certificate for Frontend Domain
resource "google_compute_managed_ssl_certificate" "frontend_domain_ssl" {
  name = "frontend-domain-ssl-cert"

  managed {
    domains = [
      var.domain_name,
      "www.${var.domain_name}",
      "api.${var.domain_name}",
      "ws.${var.domain_name}"
    ]
  }
}

# SSL Certificate for API Domain
resource "google_compute_managed_ssl_certificate" "api_domain_ssl" {
  name = "api-domain-ssl-cert"

  managed {
    domains = [
      "api.${var.domain_name}",
      "ws.${var.domain_name}"
    ]
  }
}

# Certificate Map for Advanced SSL Configuration
resource "google_certificate_manager_certificate_map" "alpha_orion" {
  name = "alpha-orion-cert-map"
}

resource "google_certificate_manager_certificate_map_entry" "frontend" {
  map     = google_certificate_manager_certificate_map.alpha_orion.name
  certificates = [google_compute_managed_ssl_certificate.frontend_domain_ssl.id]
  hostname = var.domain_name
}

resource "google_certificate_manager_certificate_map_entry" "api" {
  map     = google_certificate_manager_certificate_map.alpha_orion.name
  certificates = [google_compute_managed_ssl_certificate.api_domain_ssl.id]
  hostname = "api.${var.domain_name}"
}

# Global IPv6 Address for Frontend (Optional)
resource "google_compute_global_address" "frontend_ipv6" {
  name       = "frontend-global-ipv6"
  ip_version = "IPV6"
}

# Global Address for API Gateway
resource "google_compute_global_address" "api_ip" {
  name = "api-global-ip"
}

# DNS Health Check
resource "google_dns_response_policy" "security_policy" {
  response_policy_name = "alpha-orion-security-policy"

  networks {
    network_url = google_compute_network.vpc.id
  }
}

# DNS Response Policy Rules for Security
resource "google_dns_response_policy_rule" "block_malicious" {
  response_policy = google_dns_response_policy.security_policy.response_policy_name
  rule_name       = "block-malicious-domains"
  dns_name        = "*.malicious.*"

  local_data {
    local_datas {
      name    = "*.malicious.*"
      type    = "A"
      ttl     = 300
      rrdatas = ["0.0.0.0"]
    }
  }
}

# Outputs
output "name_servers" {
  description = "DNS name servers for the domain"
  value       = google_dns_managed_zone.alpha_orion.name_servers
}

output "domain_name" {
  description = "Primary domain name"
  value       = var.domain_name
}

output "frontend_ip" {
  description = "Frontend global IP address"
  value       = google_compute_global_address.frontend_ip.address
}

output "api_ip" {
  description = "API global IP address"
  value       = google_compute_global_address.api_ip.address
}

output "ssl_certificate_status" {
  description = "SSL certificate provisioning status"
  value       = google_compute_managed_ssl_certificate.frontend_domain_ssl.managed[0].status
}

output "dns_zone_name" {
  description = "Cloud DNS zone name"
  value       = google_dns_managed_zone.alpha_orion.name
}
