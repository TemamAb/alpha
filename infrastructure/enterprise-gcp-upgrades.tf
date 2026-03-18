# ENTERPRISE GCP INFRASTRUCTURE UPGRADES FOR ALPHA-ORION
# This file contains the Terraform configurations for institutional-grade arbitrage infrastructure

# ============================================
# PHASE 1: NETWORK & COMPUTE FOUNDATION
# ============================================

# Dedicated Interconnect for Ultra-Low Latency
module "arbitrage_interconnect" {
  source  = "terraform-google-modules/cloud-router/google//modules/dedicated_interconnect"
  version = "~> 6.0"

  project = var.project_id
  region  = "us-central1"
  name    = "arbitrage-interconnect"

  # Connect to major exchange data centers (Equinix, CoreSite, etc.)
  interconnects = [
    {
      name                 = "arbitrage-nyc1"
      location             = "us-east4"  # Northern Virginia (Equinix)
      requested_link_count = 2
      link_type            = "LINK_TYPE_ETHERNET_10G_LR"
      admin_enabled        = true
    },
    {
      name                 = "arbitrage-nyc2"
      location             = "us-east4"  # Chicago (Equinix)
      requested_link_count = 2
      link_type            = "LINK_TYPE_ETHERNET_10G_LR"
      admin_enabled        = true
    }
  ]

  # BGP configuration for exchange connectivity
  bgp_configs = [
    {
      group_name       = "arbitrage-bgp-group"
      admin_enabled    = true
      advertised_groups = ["ALL_SUBNETS"]
      advertised_ip_ranges = [
        "10.0.0.0/16",  # Arbitrage subnet
        "10.1.0.0/16"   # ML/AI subnet
      ]
    }
  ]
}

# Premium VPC Network with Global Routing
module "arbitrage_vpc" {
  source  = "terraform-google-modules/network/google"
  version = "~> 7.0"

  project_id   = var.project_id
  network_name = "arbitrage-network"

  subnets = [
    {
      subnet_name   = "arbitrage-us-central1"
      subnet_ip     = "10.0.0.0/16"
      subnet_region = "us-central1"
    },
    {
      subnet_name   = "arbitrage-us-east4"
      subnet_ip     = "10.1.0.0/16"
      subnet_region = "us-east4"
    },
    {
      subnet_name   = "arbitrage-europe-west1"
      subnet_ip     = "10.2.0.0/16"
      subnet_region = "europe-west1"
    }
  ]

  # Enable global routing for arbitrage
  routing_mode = "GLOBAL"

  # Network telemetry for performance monitoring
  enable_flow_logs = true
  flow_logs_config = {
    aggregation_interval = "INTERVAL_1_MIN"
    flow_sampling        = 1.0  # Sample all flows for arbitrage
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Bare Metal Compute Engine for Deterministic Performance
module "arbitrage_compute_engine" {
  source  = "terraform-google-modules/vm/google//modules/compute_instance"
  version = "~> 8.0"

  for_each = toset(["arbitrage-engine-01", "arbitrage-engine-02", "arbitrage-engine-03"])

  name         = each.key
  machine_type = "n2-standard-32"  # High-performance CPU
  zone         = "us-central1-a"
  project      = var.project_id

  # Bare metal configuration for deterministic performance
  min_cpu_platform = "Intel Cascade Lake"

  # Ultra-fast SSD storage
  boot_disk = {
    initialize_params = {
      image = "cos-cloud/cos-stable"  # Container-Optimized OS
      size  = 100
      type  = "pd-extreme"  # 120,000 IOPS, 4GB/s throughput
    }
  }

  # Additional extreme SSD for market data
  attached_disks = [
    {
      name = "market-data-disk"
      size = 2000  # 2TB for historical data
      type = "pd-extreme"
    },
    {
      name = "ml-models-disk"
      size = 500   # 500GB for ML models
      type = "pd-extreme"
    }
  ]

  # GPU acceleration for ML inference
  gpu = {
    type  = "nvidia-tesla-t4"
    count = 2  # Dual GPU for parallel processing
  }

  # Network optimization
  network_interface = {
    network    = module.arbitrage_vpc.network_name
    subnetwork = "arbitrage-us-central1"

    # Enable high throughput
    nic_type = "GVNIC"  # Google Virtual NIC for higher throughput
  }

  # Service account with minimal required permissions
  service_account = {
    email  = google_service_account.arbitrage_compute.email
    scopes = ["cloud-platform"]
  }

  # Metadata for arbitrage-specific configuration
  metadata = {
    arbitrage-role = "market-data-processor"
    gpu-enabled    = "true"
    low-latency    = "true"
  }

  # Enable confidential computing for sensitive arbitrage logic
  confidential_instance_config = {
    enable_confidential_compute = true
  }

  # Shielded VM for additional security
  shielded_instance_config = {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }
}

# Ultra-Low Latency Memorystore Redis
module "arbitrage_memorystore" {
  source  = "terraform-google-modules/memorystore/google"
  version = "~> 9.0"

  name           = "arbitrage-redis-ultra"
  project        = var.project_id
  region         = "us-central1"
  location_id    = "us-central1-a"
  alternative_location_id = "us-central1-c"

  tier           = "STANDARD_HA"
  replica_count  = 3  # High availability
  memory_size_gb = 50  # 50GB for high-throughput arbitrage

  # Ultra-low latency configuration
  redis_configs = {
    maxmemory-policy       = "allkeys-lru"
    tcp-keepalive         = "30"   # Aggressive keepalive
    timeout               = "300"
    maxclients            = "20000"  # High connection limit
    tcp-backlog           = "1024"
    databases             = "16"     # Multiple databases for different data types
  }

  # Connect to arbitrage VPC
  authorized_network = module.arbitrage_vpc.network_name
  connect_mode        = "PRIVATE_SERVICE_ACCESS"

  # Maintenance window for minimal disruption
  maintenance_policy = {
    day = "SUNDAY"
    start_time = {
      hours   = 3
      minutes = 0
    }
  }
}

# ============================================
# PHASE 2: REAL-TIME DATA PIPELINE
# ============================================

# Dataflow for Microsecond Data Processing
module "arbitrage_dataflow" {
  source  = "terraform-google-modules/dataflow/google"
  version = "~> 3.0"

  name       = "arbitrage-real-time-processor"
  project    = var.project_id
  region     = "us-central1"
  zone       = "us-central1-a"
  network    = module.arbitrage_vpc.network_name
  subnetwork = "arbitrage-us-central1"

  # Custom container for arbitrage processing
  template_gcs_path = "gs://arbitrage-templates/arbitrage-processor:latest"
  temp_gcs_location  = "gs://arbitrage-temp"

  # High-performance machine configuration
  machine_type    = "n2-highcpu-32"
  max_workers     = 100  # Scale to 100 workers
  num_workers     = 10   # Start with 10
  disk_size_gb    = 100

  # GPU acceleration for ML processing
  worker_accelerator = {
    type  = "nvidia-tesla-t4"
    count = 1
  }

  # Real-time streaming parameters
  streaming = true
  parameters = {
    input_subscription     = google_pubsub_subscription.arbitrage_opportunities.id
    output_topic          = google_pubsub_topic.processed_opportunities.id
    window_size           = "5"    # 5-second windows
    sliding_interval      = "1"    # 1-second sliding
    max_bundle_size       = "1000" # Process 1000 messages per bundle
    num_shards            = "10"   # 10 output shards
    enable_at_least_once  = false  # Exactly-once processing
  }

  # Autoscaling configuration
  autoscaling_algorithm = "THROUGHPUT_BASED"
  max_num_workers      = 200
  worker_utilization_hint = 0.8

  # Service account with required permissions
  service_account_email = google_service_account.arbitrage_dataflow.email
}

# Bigtable for Petabyte-Scale Market Data
module "arbitrage_bigtable" {
  source  = "terraform-google-modules/bigtable/google"
  version = "~> 2.0"

  name       = "arbitrage-market-data"
  project    = var.project_id
  instance_type = "PRODUCTION"
  cluster_id = "arbitrage-cluster"

  # Multi-zone deployment for high availability
  zones = ["us-central1-a", "us-central1-c", "us-central1-f"]

  # Extreme performance storage
  storage_type = "SSD"
  num_nodes    = 20  # Scale as needed (each node = 1TB, 10,000+ QPS)

  # Column families for different data types
  column_families = {
    # Real-time market data
    market_data = {
      gc_policy = {
        max_age = "30d"
      }
      value_type = "BYTES"
    }

    # Arbitrage opportunities
    arbitrage_opportunities = {
      gc_policy = {
        max_age = "7d"
      }
      value_type = "BYTES"
    }

    # Execution history
    execution_history = {
      gc_policy = {
        max_age = "90d"
      }
      value_type = "BYTES"
    }

    # ML model predictions
    ml_predictions = {
      gc_policy = {
        max_age = "1d"
      }
      value_type = "BYTES"
    }

    # Risk metrics
    risk_metrics = {
      gc_policy = {
        max_age = "365d"
      }
      value_type = "BYTES"
    }
  }

  # Automated backups
  backup = {
    name        = "arbitrage-bigtable-backup"
    cluster_id  = "arbitrage-cluster"
    table_id    = "market-data"
    expire_time = "2026-01-01T00:00:00Z"
  }
}

# Pub/Sub Lite for Higher Throughput Messaging
module "arbitrage_pubsub_lite" {
  source  = "terraform-google-modules/pubsub/google//modules/pubsub-lite"
  version = "~> 3.0"

  project = var.project_id
  region  = "us-central1"
  zone    = "us-central1-a"

  # High-throughput topics for arbitrage data
  topics = [
    {
      name = "arbitrage-market-data"
      partitions = 10  # 10 partitions for parallel processing
      throughput = {
        capacity = 20  # 20 MB/s per partition
      }
      retention_duration = "86400s"  # 24 hours
    },
    {
      name = "arbitrage-opportunities"
      partitions = 20
      throughput = {
        capacity = 50  # Higher throughput for opportunities
      }
      retention_duration = "3600s"  # 1 hour
    },
    {
      name = "arbitrage-executions"
      partitions = 5
      throughput = {
        capacity = 10
      }
      retention_duration = "604800s"  # 7 days
    }
  ]

  # Subscriptions for processing
  subscriptions = [
    {
      name  = "arbitrage-market-data-processor"
      topic = "arbitrage-market-data"
    },
    {
      name  = "arbitrage-opportunity-processor"
      topic = "arbitrage-opportunities"
    },
    {
      name  = "arbitrage-execution-monitor"
      topic = "arbitrage-executions"
    }
  ]
}

# ============================================
# PHASE 3: ENTERPRISE SECURITY
# ============================================

# Cloud Armor Advanced Protection
module "arbitrage_cloud_armor" {
  source  = "terraform-google-modules/cloud-armor/google"
  version = "~> 2.0"

  project     = var.project_id
  name        = "arbitrage-security-policy"
  description = "Enterprise security for institutional arbitrage platform"

  # Rate limiting for arbitrage APIs
  rules = [
    {
      action      = "rate_based_ban"
      priority    = 100
      description = "Rate limiting for arbitrage APIs"

      rate_limit_options = {
        rate_limit_threshold_count        = 10000  # Higher limit for institutional use
        rate_limit_threshold_interval_sec = 60
        ban_duration_sec                 = 300
        ban_http_code                    = 429
      }

      match = {
        versioned_expr = "SRC_IPS_V1"
        config = {
          src_ip_ranges = ["*"]  # Apply to all IPs
        }
      }
    },
    {
      action      = "deny(403)"
      priority    = 200
      description = "Block known malicious IPs"

      match = {
        versioned_expr = "SRC_IPS_V1"
        config = {
          src_ip_ranges = var.blocked_ip_ranges
        }
      }
    }
  ]

  # Adaptive protection against DDoS and bots
  adaptive_protection_config = {
    layer_7_ddos_defense_config = {
      enable = true
      rule_visibility = "STANDARD"
      threshold_sensitivity = "LOW"  # More sensitive detection
    }

    auto_deploy_config = {
      load_threshold = 0.8  # Deploy rules at 80% load
      confidence_threshold = 0.9  # High confidence threshold
    }
  }

  # Pre-configured WAF rules
  pre_configured_waf_config = {
    exclusion = []
  }

  # Custom security rules for arbitrage
  custom_rules = [
    {
      action   = "deny(403)"
      priority = 300
      description = "Block arbitrage API abuse"

      match = {
        expr = {
          expression = "request.path.matches('/api/arbitrage') && request.headers['user-agent'].contains('bot')"
        }
      }
    }
  ]
}

# Security Command Center Enterprise
module "security_command_center" {
  source  = "terraform-google-modules/security-command-center/google"
  version = "~> 1.0"

  organization_id = var.organization_id
  project_id      = var.project_id

  # Enable all enterprise security sources
  services = [
    "CONTAINER_THREAT_DETECTION",
    "EVENT_THREAT_DETECTION",
    "SECURITY_HEALTH_ANALYTICS",
    "WEB_SECURITY_SCANNER",
    "CONTINUOUS_EXPORT"
  ]

  # Custom modules for arbitrage-specific threats
  custom_modules = {
    arbitrage_anomaly_detection = {
      display_name = "Arbitrage Platform Anomaly Detection"
      enablement_state = "ENABLED"
      update_time = timestamp()
    }

    flash_loan_attack_detection = {
      display_name = "Flash Loan Attack Detection"
      enablement_state = "ENABLED"
      update_time = timestamp()
    }

    mev_detection = {
      display_name = "MEV Attack Detection"
      enablement_state = "ENABLED"
      update_time = timestamp()
    }
  }

  # Notification configurations
  notification_configs = [
    {
      name        = "arbitrage-security-alerts"
      description = "Critical security alerts for arbitrage platform"

      pubsub_topic = google_pubsub_topic.security_alerts.id

      streaming_config = {
        filter = "severity >= HIGH"
      }
    }
  ]
}

# VPC Service Controls for Data Exfiltration Prevention
module "vpc_service_controls" {
  source  = "terraform-google-modules/vpc-service-controls/google"
  version = "~> 5.0"

  project_id = var.project_id

  # Perimeter for arbitrage data protection
  service_perimeters = [
    {
      name        = "arbitrage-data-perimeter"
      title       = "Arbitrage Data Protection Perimeter"
      description = "VPC-SC perimeter for arbitrage platform data protection"

      perimeter_type = "PERIMETER_TYPE_REGULAR"

      restricted_services = [
        "storage.googleapis.com",
        "bigtable.googleapis.com",
        "bigquery.googleapis.com",
        "aiplatform.googleapis.com"
      ]

      resources = [
        google_project.arbitrage_project.number
      ]

      access_levels = [
        google_access_context_manager_access_level.arbitrage_access.id
      ]

      ingress_policies = [
        {
          name        = "arbitrage-data-ingress"
          title       = "Allow arbitrage service access"
          description = "Allow arbitrage services to access protected data"

          ingress_from = {
            identities = [
              "serviceAccount:${google_service_account.arbitrage_compute.email}"
            ]
            sources = {
              access_levels = [
                google_access_context_manager_access_level.arbitrage_access.id
              ]
            }
          }

          ingress_to = {
            resources = ["*"]
            operations = {
              "storage.buckets.get" = {}
              "bigtable.instances.get" = {}
            }
          }
        }
      ]
    }
  ]
}

# ============================================
# PHASE 4: GLOBAL DISTRIBUTION & CDN
# ============================================

# Global Load Balancer with Anycast
module "arbitrage_global_lb" {
  source  = "terraform-google-modules/lb-http/google"
  version = "~> 9.0"

  name    = "arbitrage-global-lb"
  project = var.project_id

  # Global anycast IP for ultra-low latency
  load_balancing_scheme = "EXTERNAL_MANAGED"
  protocol              = "HTTPS"

  # SSL configuration
  ssl = true
  managed_ssl_certificate_domains = [
    "arbitrage.alpha-orion.com",
    "api.alpha-orion.com"
  ]

  # CDN configuration for global distribution
  cdn = {
    enable = true
    cache_mode = "USE_ORIGIN_HEADERS"
    default_ttl = 30    # 30 seconds for real-time data
    max_ttl     = 300   # 5 minutes max
    client_ttl  = 30

    # Custom cache keys for arbitrage data
    cache_key_policy = {
      include_host         = true
      include_protocol     = true
      include_query_string = true
      query_string_blacklist = []
      query_string_whitelist = ["*"]
    }

    # Negative caching for API errors
    negative_caching = true
    negative_caching_policy = {
      code = 404
      ttl  = 60
    }
  }

  # Global backend services with health checks
  backends = {
    us_central_backend = {
      protocol  = "HTTPS"
      port      = 443
      port_name = "https"
      timeout_sec = 30

      # Advanced health checks
      health_check = {
        request_path       = "/health"
        port               = 443
        check_interval_sec = 5
        timeout_sec        = 5
        healthy_threshold  = 2
        unhealthy_threshold = 3
        host               = "api-us.alpha-orion.com"
      }

      # Backend groups
      groups = [
        {
          group = google_compute_region_instance_group_manager.arbitrage_us.instance_group
        }
      ]

      # Traffic steering
      balancing_mode = "UTILIZATION"
      capacity_scaler = 1.0
      max_utilization = 0.8
    }

    eu_west_backend = {
      protocol  = "HTTPS"
      port      = 443
      port_name = "https"
      timeout_sec = 30

      health_check = {
        request_path       = "/health"
        port               = 443
        check_interval_sec = 5
        timeout_sec        = 5
        healthy_threshold  = 2
        unhealthy_threshold = 3
        host               = "api-eu.alpha-orion.com"
      }

      groups = [
        {
          group = google_compute_region_instance_group_manager.arbitrage_eu.instance_group
        }
      ]

      balancing_mode = "UTILIZATION"
      capacity_scaler = 1.0
      max_utilization = 0.8
    }

    asia_southeast_backend = {
      protocol  = "HTTPS"
      port      = 443
      port_name = "https"
      timeout_sec = 30

      health_check = {
        request_path       = "/health"
        port               = 443
        check_interval_sec = 10  # Longer interval for Asia
        timeout_sec        = 10
        healthy_threshold  = 2
        unhealthy_threshold = 3
        host               = "api-asia.alpha-orion.com"
      }

      groups = [
        {
          group = google_compute_region_instance_group_manager.arbitrage_asia.instance_group
        }
      ]

      balancing_mode = "UTILIZATION"
      capacity_scaler = 1.0
      max_utilization = 0.8
    }
  }

  # URL routing rules
  url_map = {
    default_service = google_compute_backend_service.arbitrage_default.id

    host_rules = [
      {
        hosts        = ["api.alpha-orion.com"]
        path_matcher = "api-paths"
      },
      {
        hosts        = ["dashboard.alpha-orion.com"]
        path_matcher = "dashboard-paths"
      }
    ]

    path_matchers = [
      {
        name = "api-paths"
        default_service = google_compute_backend_service.arbitrage_api.id

        path_rules = [
          {
            paths   = ["/api/arbitrage/*"]
            service = google_compute_backend_service.arbitrage_compute.id
          },
          {
            paths   = ["/api/market-data/*"]
            service = google_compute_backend_service.arbitrage_dataflow.id
          }
        ]
      },
      {
        name = "dashboard-paths"
        default_service = google_compute_backend_service.arbitrage_dashboard.id
      }
    ]
  }
}

# ============================================
# PHASE 5: ADVANCED AI/ML INFRASTRUCTURE
# ============================================

# Vertex AI for Real-Time ML Inference
module "arbitrage_vertex_ai" {
  source  = "terraform-google-modules/vertex-ai/google"
  version = "~> 1.0"

  project_id = var.project_id
  region     = "us-central1"

  # Real-time prediction endpoints for arbitrage
  endpoints = [
    {
      name         = "arbitrage-opportunity-predictor"
      display_name = "Arbitrage Opportunity Predictor"
      description  = "Real-time ML model for arbitrage opportunity prediction"

      model = google_vertex_ai_model.arbitrage_predictor.id
      machine_type = "n1-standard-8"

      # GPU acceleration for low-latency inference
      accelerator_type  = "NVIDIA_TESLA_T4"
      accelerator_count = 2  # Dual GPU for parallel inference

      # Traffic splitting for A/B testing
      traffic_split = {
        "0" = 90  # 90% to current model
        "1" = 10  # 10% to new model version
      }

      # Autoscaling configuration
      min_replica_count = 1
      max_replica_count = 10

      # Monitoring configuration
      monitoring_config = {
        enable_request_response_logging = true
        sampling_rate                  = 1.0  # Log all predictions for analysis
      }
    },
    {
      name         = "risk-assessment-engine"
      display_name = "Risk Assessment Engine"
      description  = "Real-time risk assessment for arbitrage positions"

      model = google_vertex_ai_model.risk_assessor.id
      machine_type = "n1-standard-4"

      accelerator_type  = "NVIDIA_TESLA_T4"
      accelerator_count = 1

      min_replica_count = 1
      max_replica_count = 5
    },
    {
      name         = "market-impact-predictor"
      display_name = "Market Impact Predictor"
      description  = "Predict price impact of arbitrage trades"

      model = google_vertex_ai_model.market_impact.id
      machine_type = "n1-standard-4"

      accelerator_type  = "NVIDIA_TESLA_T4"
      accelerator_count = 1

      min_replica_count = 1
      max_replica_count = 3
    }
  ]

  # Batch prediction for backtesting and strategy optimization
  batch_predictions = [
    {
      name         = "arbitrage-strategy-backtest"
      model        = google_vertex_ai_model.arbitrage_predictor.id
      display_name = "Arbitrage Strategy Backtesting"

      input_config = {
        instances_format = "jsonl"
        gcs_source = {
          uris = ["gs://arbitrage-backtest-data/2024/*.jsonl"]
        }
      }

      output_config = {
        predictions_format = "jsonl"
        gcs_destination = {
          output_uri_prefix = "gs://arbitrage-backtest-results/2024/"
        }
      }

      # Dedicated resources for batch processing
      dedicated_resources = {
        machine_spec = {
          machine_type = "n1-standard-16"
          accelerator_type = "NVIDIA_TESLA_T4"
          accelerator_count = 2
        }
        starting_replica_count = 5
        max_replica_count = 20
      }
    }
  ]
}

# BigQuery ML for Advanced Analytics
module "arbitrage_bigquery_ml" {
  source  = "terraform-google-modules/bigquery/google"
  version = "~> 7.0"

  dataset_id = "arbitrage_analytics"
  project_id = var.project_id
  location   = "us-central1"

  # ML models for arbitrage analytics
  ml_models = [
    {
      model_id = "arbitrage_success_predictor"
      model_type = "BOOSTED_TREE_CLASSIFIER"

      data_split_method = "AUTO_SPLIT"
      data_split_eval_fraction = 0.2

      training_data = """
        SELECT
          price_diff,
          volume_ratio,
          gas_price_usd,
          time_of_day,
          day_of_week,
          market_volatility_24h,
          liquidity_depth_usd,
          dex_count,
          chain_count,
          execution_time_ms,
          gas_used,
          net_profit_usd,
          CASE WHEN net_profit_usd > 0 THEN 1 ELSE 0 END as profitable
        FROM `arbitrage_dataset.execution_history`
        WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
          AND net_profit_usd IS NOT NULL
      """

      # Model hyperparameters optimized for arbitrage
      hyper_parameters = {
        max_iterations = 100
        early_stop = true
        min_rel_progress = 0.001
        tree_method = "HIST"
        subsample = 0.8
        colsample_bytree = 0.8
      }
    },
    {
      model_id = "optimal_position_sizer"
      model_type = "LINEAR_REG"

      training_data = """
        SELECT
          price_diff,
          market_volatility_24h,
          liquidity_depth_usd,
          gas_price_usd,
          historical_win_rate,
          portfolio_size_usd,
          optimal_position_size_usd
        FROM `arbitrage_dataset.position_sizing_history`
        WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)
      """
    },
    {
      model_id = "gas_price_optimizer"
      model_type = "DNN_REGRESSOR"

      training_data = """
        SELECT
          network_congestion_ratio,
          pending_tx_count,
          gas_price_gwei,
          block_fullness_ratio,
          time_to_inclusion_seconds,
          mev_competition_level,
          trade_urgency_score
        FROM `arbitrage_dataset.gas_optimization_history`
        WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      """

      hyper_parameters = {
        hidden_units = ["64", "32", "16"]
        dropout = 0.1
        batch_size = 32
        max_steps = 10000
      }
    }
  ]

  # Scheduled queries for continuous model training
  scheduled_queries = [
    {
      name = "daily_model_retraining"
      description = "Daily retraining of arbitrage ML models"

      schedule = "every day 02:00"

      query = """
        CREATE OR REPLACE MODEL `arbitrage_analytics.arbitrage_success_predictor`
        OPTIONS (
          model_type='BOOSTED_TREE_CLASSIFIER',
          data_split_method='AUTO_SPLIT',
          data_split_eval_fraction=0.2,
          early_stop=TRUE,
          max_iterations=100
        ) AS
        SELECT * FROM `arbitrage_dataset.training_data_latest`;
      """
    }
  ]
}

# ============================================
# MONITORING & OBSERVABILITY ENHANCEMENTS
# ============================================

# Cloud Monitoring Enterprise Dashboards
module "arbitrage_monitoring_dashboards" {
  source  = "terraform-google-modules/cloud-monitoring/google"
  version = "~> 1.0"

  project_id = var.project_id

  dashboards = [
    {
      dashboard_json = jsonencode({
        displayName = "Arbitrage Platform - Real-Time Overview"
        gridLayout = {
          columns = "3"
          widgets = [
            # Profit Generation Metrics
            {
              title = "Profit Generation Rate (USD/min)"
              xyChart = {
                dataSets = [{
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"custom.googleapis.com/arbitrage/profit_rate\" AND resource.type=\"gce_instance\""
                      aggregation = {
                        alignmentPeriod = "60s"
                        crossSeriesReducer = "REDUCE_SUM"
                        groupByFields = ["resource.label.instance_name"]
                      }
                    }
                    unitOverride = "USD/min"
                  }
                }]
                yAxis = {
                  label = "Profit Rate"
                  scale = "LINEAR"
                }
                chartOptions = {
                  mode = "COLOR"
                }
              }
            },
            # Execution Latency
            {
              title = "Trade Execution Latency"
              xyChart = {
                dataSets = [{
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"custom.googleapis.com/arbitrage/execution_latency\""
                      aggregation = {
                        alignmentPeriod = "10s"
                        crossSeriesReducer = "REDUCE_PERCENTILE_95"
                      }
                    }
                    unitOverride = "ms"
                  }
                }]
                yAxis = {
                  label = "Latency (ms)"
                  scale = "LOG10"
                }
                thresholds = [{
                  label = "Target Latency"
                  value  = 50
                  color  = "GREEN"
                }]
              }
            },
            # Success Rate
            {
              title = "Trade Success Rate"
              xyChart = {
                dataSets = [{
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"custom.googleapis.com/arbitrage/success_rate\""
                      aggregation = {
                        alignmentPeriod = "60s"
                        crossSeriesReducer = "REDUCE_MEAN"
                      }
                    }
                    unitOverride = "%"
                  }
                }]
                yAxis = {
                  label = "Success Rate (%)"
                  scale = "LINEAR"
                }
                thresholds = [{
                  label = "Target Rate"
                  value  = 95
                  color  = "YELLOW"
                }]
              }
            },
            # Risk Metrics
            {
              title = "Portfolio VaR (95%)"
              xyChart = {
                dataSets = [{
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"custom.googleapis.com/risk/value_at_risk\""
                      aggregation = {
                        alignmentPeriod = "300s"
                        crossSeriesReducer = "REDUCE_MAX"
                      }
                    }
                    unitOverride = "USD"
                  }
                }]
                yAxis = {
                  label = "VaR (USD)"
                  scale = "LINEAR"
                }
                thresholds = [{
                  label = "Risk Limit"
                  value  = 1000
                  color  = "RED"
                }]
              }
            },
            # System Performance
            {
              title = "System Performance"
              xyChart = {
                dataSets = [
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "metric.type=\"compute.googleapis.com/instance/cpu/utilization\" AND resource.type=\"gce_instance\""
                        aggregation = {
                          alignmentPeriod = "60s"
                          crossSeriesReducer = "REDUCE_MEAN"
                        }
                      }
                      unitOverride = "%"
                    }
                    legendTemplate = "CPU Usage"
                  },
                  {
                    timeSeriesQuery = {
                      timeSeriesFilter = {
                        filter = "metric.type=\"compute.googleapis.com/instance/memory/utilization\" AND resource.type=\"gce_instance\""
                        aggregation = {
                          alignmentPeriod = "60s"
                          crossSeriesReducer = "REDUCE_MEAN"
                        }
                      }
                      unitOverride = "%"
                    }
                    legendTemplate = "Memory Usage"
                  }
                ]
                yAxis = {
                  label = "Usage (%)"
                  scale = "LINEAR"
                }
                thresholds = [{
                  label = "High Usage"
                  value  = 85
                  color  = "YELLOW"
                }]
              }
            },
            # Network Performance
            {
              title = "Network Performance"
              xyChart = {
                dataSets = [{
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "metric.type=\"custom.googleapis.com/network/latency\""
                      aggregation = {
                        alignmentPeriod = "10s"
                        crossSeriesReducer = "REDUCE_PERCENTILE_95"
                      }
                    }
                    unitOverride = "ms"
                  }
                }]
                yAxis = {
                  label = "Latency (ms)"
                  scale = "LINEAR"
                }
                thresholds = [{
                  label = "Target Latency"
                  value  = 1
                  color  = "GREEN"
                }]
              }
            }
          ]
        }
      })
    }
  ]
}

# ============================================
# COST OPTIMIZATION & SPOT INSTANCES
# ============================================

# Spot Instances for Batch Processing
module "arbitrage_spot_instances" {
  source  = "terraform-google-modules/vm/google//modules/compute_instance"
  version = "~> 8.0"

  for_each = toset(["arbitrage-batch-01", "arbitrage-batch-02", "arbitrage-batch-03"])

  name         = each.key
  machine_type = "n2-standard-16"
  zone         = "us-central1-c"
  project      = var.project_id

  # Spot pricing for 70% cost reduction
  scheduling = {
    preemptible         = false
    on_host_maintenance = "TERMINATE"
    automatic_restart   = false
    provisioning_model  = "SPOT"
  }

  boot_disk = {
    initialize_params = {
      image = "cos-cloud/cos-stable"
      size  = 50
      type  = "pd-standard"
    }
  }

  network_interface = {
    network    = module.arbitrage_vpc.network_name
    subnetwork = "arbitrage-us-central1"
  }

  service_account = {
    email  = google_service_account.arbitrage_batch.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    arbitrage-role = "batch-processor"
    spot-enabled   = "true"
  }
}

# ============================================
# SERVICE ACCOUNTS & IAM
# ============================================

# Service Account for Arbitrage Compute
resource "google_service_account" "arbitrage_compute" {
  account_id   = "arbitrage-compute"
  display_name = "Arbitrage Compute Service Account"
  project      = var.project_id
}

# Service Account for Data Processing
resource "google_service_account" "arbitrage_dataflow" {
  account_id   = "arbitrage-dataflow"
  display_name = "Arbitrage Dataflow Service Account"
  project      = var.project_id
}

# Service Account for Batch Processing
resource "google_service_account" "arbitrage_batch" {
  account_id   = "arbitrage-batch"
  display_name = "Arbitrage Batch Processing Service Account"
  project      = var.project_id
}

# IAM Bindings for Service Accounts
resource "google_project_iam_member" "arbitrage_compute_roles" {
  for_each = toset([
    "roles/compute.instanceAdmin.v1",
    "roles/storage.objectViewer",
    "roles/bigtable.user",
    "roles/pubsub.publisher",
    "roles/pubsub.subscriber",
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter"
  ])

  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.arbitrage_compute.email}"
}

# ============================================
# OUTPUTS
# ============================================

output "arbitrage_global_lb_ip" {
  description = "Global load balancer IP address"
  value       = module.arbitrage_global_lb.external_ip
}

output "arbitrage_bigtable_instance_id" {
  description = "Bigtable instance ID for market data"
  value       = module.arbitrage_bigtable.instance_id
}

output "arbitrage_memorystore_host" {
  description = "Memorystore Redis host"
  value       = module.arbitrage_memorystore.host
}

output "arbitrage_vertex_ai_endpoints" {
  description = "Vertex AI endpoint IDs"
  value       = module.arbitrage_vertex_ai.endpoint_ids
}

output "arbitrage_compute_instances" {
  description = "Compute instance names"
  value       = [for instance in module.arbitrage_compute_engine : instance.instance.name]
}</content>
</xai:function_call