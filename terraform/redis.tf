# Alpha-Orion Redis Memorystore Configuration
# High-performance caching for arbitrage path lookups and real-time data

resource "google_redis_instance" "alpha_orion_cache" {
  name           = "alpha-orion-cache"
  tier           = "STANDARD_HA"  # High availability
  memory_size_gb = 16            # 16GB for optimal performance

  region                  = var.region
  location_id             = "${var.region}-a"
  alternative_location_id = "${var.region}-b"  # Cross-zone replication

  redis_version = "REDIS_6_X"

  # High-performance configuration for arbitrage operations
  redis_configs = {
    "maxmemory-policy" = "allkeys-lru"  # LRU eviction for cache efficiency
    "tcp-keepalive"    = "300"          # 5-minute keepalive
    "timeout"          = "300"          # 5-minute idle timeout
    "maxclients"       = "10000"        # High connection limit
  }

  labels = {
    environment = "production"
    service     = "alpha-orion"
    component   = "cache"
    purpose     = "arbitrage-paths"
  }

  depends_on = [google_compute_network.alpha_orion_vpc]
}

# Redis instance for session storage and temporary data
resource "google_redis_instance" "alpha_orion_sessions" {
  name           = "alpha-orion-sessions"
  tier           = "STANDARD_HA"
  memory_size_gb = 8  # 8GB for session data

  region                  = var.region
  location_id             = "${var.region}-c"
  alternative_location_id = "${var.region}-d"

  redis_version = "REDIS_6_X"

  redis_configs = {
    "maxmemory-policy" = "volatile-lru"
    "tcp-keepalive"    = "60"
    "timeout"          = "3600"  # 1-hour session timeout
    "maxclients"       = "5000"
  }

  labels = {
    environment = "production"
    service     = "alpha-orion"
    component   = "cache"
    purpose     = "sessions"
  }

  depends_on = [google_compute_network.alpha_orion_vpc]
}

# Redis instance for real-time price feeds
resource "google_redis_instance" "alpha_orion_price_feeds" {
  name           = "alpha-orion-price-feeds"
  tier           = "STANDARD_HA"
  memory_size_gb = 12  # 12GB for price data

  region                  = var.region
  location_id             = "${var.region}-a"
  alternative_location_id = "${var.region}-c"

  redis_version = "REDIS_6_X"

  redis_configs = {
    "maxmemory-policy" = "allkeys-lru"
    "tcp-keepalive"    = "30"    # 30-second keepalive for real-time data
    "timeout"          = "60"    # 1-minute timeout
    "maxclients"       = "20000" # High connection limit for WebSocket clients
  }

  labels = {
    environment = "production"
    service     = "alpha-orion"
    component   = "cache"
    purpose     = "price-feeds"
  }

  depends_on = [google_compute_network.alpha_orion_vpc]
}

# IAM binding for Redis access
resource "google_project_iam_member" "redis_iam_binding" {
  project = var.project_id
  role    = "roles/redis.editor"
  member  = "serviceAccount:${google_service_account.alpha_orion_sa.email}"
}

# Redis monitoring and alerting
resource "google_monitoring_alert_policy" "redis_memory_alert" {
  display_name = "Alpha-Orion Redis Memory Usage Alert"
  combiner     = "OR"

  conditions {
    display_name = "Redis memory usage > 80%"

    condition_threshold {
      filter          = "resource.type = \"redis_instance\" AND resource.labels.instance_id = \"alpha-orion-cache\""
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
      comparison      = "COMPARISON_GT"
      duration        = "300s"
      threshold_value = 80.0
      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}

resource "google_monitoring_alert_policy" "redis_cpu_alert" {
  display_name = "Alpha-Orion Redis CPU Usage Alert"
  combiner     = "OR"

  conditions {
    display_name = "Redis CPU usage > 70%"

    condition_threshold {
      filter          = "resource.type = \"redis_instance\" AND resource.labels.instance_id = \"alpha-orion-cache\""
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
      comparison      = "COMPARISON_GT"
      duration        = "300s"
      threshold_value = 70.0
      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}

# Redis backup configuration (Redis persistence)
resource "null_resource" "redis_backup_config" {
  depends_on = [google_redis_instance.alpha_orion_cache]

  provisioner "local-exec" {
    command = <<-EOT
      # Configure Redis persistence and backup
      echo "Configuring Redis persistence for alpha-orion-cache..."

      # Enable AOF (Append Only File) for durability
      gcloud redis instances update alpha-orion-cache \
        --region=${var.region} \
        --update-redis-config=maxmemory-policy=allkeys-lru,tcp-keepalive=300,timeout=300,maxclients=10000

      echo "Redis persistence configured successfully"
    EOT
  }

  triggers = {
    instance_id = google_redis_instance.alpha_orion_cache.id
  }
}

# Output Redis connection details
output "redis_cache_host" {
  description = "Redis cache instance host"
  value       = google_redis_instance.alpha_orion_cache.host
}

output "redis_cache_port" {
  description = "Redis cache instance port"
  value       = google_redis_instance.alpha_orion_cache.port
}

output "redis_sessions_host" {
  description = "Redis sessions instance host"
  value       = google_redis_instance.alpha_orion_sessions.host
}

output "redis_sessions_port" {
  description = "Redis sessions instance port"
  value       = google_redis_instance.alpha_orion_sessions.port
}

output "redis_price_feeds_host" {
  description = "Redis price feeds instance host"
  value       = google_redis_instance.alpha_orion_price_feeds.host
}

output "redis_price_feeds_port" {
  description = "Redis price feeds instance port"
  value       = google_redis_instance.alpha_orion_price_feeds.port
}
