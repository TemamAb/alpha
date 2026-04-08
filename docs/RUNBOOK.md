# AlphaMark Operational Runbook

**Version:** 1.0
**Environment:** Production (Fly.io)
**App Name:** `alpha`

---

## 🚨 Overview

This document contains standard operating procedures (SOPs) for managing the AlphaMark arbitrage application. Follow these procedures to ensure system stability, security, and operational consistency.

**Primary Contact:** Lead Orchestrator

---

## 0. Prerequisites

### 0.1. Install Fly.io CLI (`flyctl`)

Before running any `fly` commands, you must have the command-line tool installed.

```bash
# Run this command once to install flyctl
curl -L https://fly.io/install.sh | sh
```
**Note:** After installation, you may need to restart your terminal or add the `flyctl` directory to your system's PATH. The installer script provides instructions.

---

## 1. Routine Health Checks

Perform these checks daily or after any deployment.

### 1.1. Check Application Status

Verify that the application's virtual machines are running and passing health checks.

```bash
# Get a high-level overview of the app's status and VMs
fly status
```

**Expected Outcome:**
The `app` and `bot` processes should be in a `running` state. Health checks should be `passing`.

### 1.2. Check API Health Endpoint

Directly query the health check endpoint to ensure the backend server is responsive and the bot is communicating.

```bash
# Get the application's hostname
APP_URL=$(fly status --json | jq -r .Hostname)

# Query the health endpoint
curl "https://${APP_URL}/api/health"
```

**Expected Outcome:**
A JSON response with `{"status":"ok", "engine":"RUNNING", ...}`. If the engine status is `STOPPED` or `PAUSED`, it should match the intended state. A `503` error indicates a critical failure (e.g., Redis is down or the bot process is unresponsive).

### 1.3. Verify Profit Generation (Audit)

Filter the live logs for the specific cryptographic signature of a successful trade.

```bash
# Search for the "Success" signature in logs
fly logs | grep "✅ Arb submitted"
```

**Expected Outcome:**
Log lines like: `✅ Arb submitted! Profit: 0.045 ETH. Hash: 0x123...`

---

## 2. Logging and Debugging

### 2.1. View Live Logs

Stream logs from all running processes to monitor real-time activity. The logs are in JSON format for easy parsing.

```bash
# Stream logs from all processes
fly logs

# Stream logs from only the bot process
fly logs --process-group bot
```

---

## 3. Application Lifecycle Management

### 3.1. Restart the Application

To apply a configuration change or recover from a hung state, restart the application.

```bash
# Restart all VMs for the application
fly apps restart alpha
```

### 3.2. Rollback to a Previous Version

If a new deployment introduces a critical bug, roll back to a previously stable version.

```bash
# List recent releases to find a stable version number
fly releases

# Deploy a specific, previously successful release
fly deploy --image <image-tag-from-releases-list>
```

---

## 4. Configuration & Secrets Management

### 4.1. Update a Secret

Update an environment variable, such as an RPC endpoint or API key. The application will restart automatically to apply the change.

```bash
# Example: Update the Ethereum RPC endpoint
fly secrets set ETHEREUM_RPC="https://new-rpc-endpoint.com"
```

---

## 5. 🚨 Emergency Procedures 🚨

### 5.1. Activate the Emergency Kill Switch

This is the fastest way to halt all trading activity if the bot is behaving erratically. This command sets the Redis key that all worker processes check before every action.

```bash
# SSH into the running machine to access the fly-redis CLI
fly ssh console

# Inside the SSH session, connect to Redis and set the kill switch
redis-cli -u <your-redis-url> SET "alphamark:kill_switch" "true"

# Exit the SSH session
exit
```

**Note:** The dashboard's "Emergency Stop" button sets a different key (`EMERGENCY_STOP`). The command above sets the key (`alphamark:kill_switch`) that the Python workers are hardcoded to check, making it the most reliable manual override.

---

## 6. CI/CD Orchestration Platform — Local Production Deployment

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HOST: localhost                                  │
│                                                                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Nginx   │  │ Dashboard │  │Pipeline Eng. │  │    Prometheus     │  │
│  │  :80/443 │  │   :8080   │  │    :5000     │  │      :9090        │  │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘  └─────────┬─────────┘  │
│       │              │               │                     │            │
│       │    ┌─────────┴───┐    ┌──────┴───────┐  ┌─────────┴─────────┐  │
│       │    │  Execution   │    │    Redis     │  │     Grafana       │  │
│       │    │    Bot       │    │    :6379     │  │      :3001        │  │
│       │    │  (internal)  │    └──────────────┘  └───────────────────┘  │
│       │    └─────────────┘                                              │
│  ─────┴─────────┴───────────────────────────────────────────────────── │
│                       alpha-net (bridge)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Service-to-Port Mapping

| Service         | External Port | Internal Port | Protocol |
|-----------------|---------------|---------------|----------|
| Nginx           | 80            | 80            | HTTP     |
| Dashboard       | 8080          | 3000          | HTTP/WS  |
| Pipeline Engine | 5000          | 5000          | HTTP     |
| Redis           | 6379          | 6379          | TCP      |
| Prometheus      | 9090          | 9090          | HTTP     |
| Grafana         | 3001          | 3000          | HTTP     |
| Node Exporter   | 9100          | 9100          | HTTP     |
| Execution Bot   | —             | —             | Redis    |

### 6.3 Quick Start (Single Command)

```bash
make up
```

This builds all images, starts all services, runs health checks, and prints access URLs.

### 6.4 Prerequisites

1. Docker Engine 24+ and Docker Compose v2
2. `.env` file configured (see `.env.example`)
3. Minimum 4GB RAM, 2 CPU cores available

### 6.5 Step-by-Step Deployment

#### Environment Setup
```bash
cp .env.example .env
# Edit .env with production keys: PRIVATE_KEY, WALLET_ADDRESS, PIMLICO_API_KEY
```

#### Build & Deploy
```bash
make up
```

#### Verify Health
```bash
make health
```

#### Access Services
- Dashboard: http://localhost:8080
- Nginx (unified): http://localhost
- Pipeline API: http://localhost:5000/health
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/alphamark2026)

### 6.6 Pipeline Operations

| Operation | Command |
|-----------|---------|
| Trigger production pipeline | `make deploy` |
| Check pipeline status | `make pipeline` |
| Execute rollback | `make rollback` |
| View all logs | `make logs` |
| View bot logs | `make logs-bot` |
| Restart all services | `make restart` |
| Stop stack | `make down` |
| Full cleanup (removes volumes) | `make clean` |

### 6.7 Webhook Integration

Configure GitHub webhook URL: `http://your-host:5000/webhook`

Routing rules (configured in `infra/pipeline-engine/pipeline_config.yml`):
- `push` to `main` → triggers `production-deploy` pipeline
- `push` to `develop` → triggers `staging-deploy` pipeline
- `pull_request` to `main` → triggers `test-only` pipeline

### 6.8 Monitoring & Alerting

Prometheus scrape targets: Nginx, Dashboard, Pipeline Engine, Redis, Node Exporter, Bot (via dashboard proxy).

Pre-configured alerts:
- Service downtime (critical)
- CPU > 90% for 5min (warning)
- Memory > 90% for 5min (warning)
- Disk < 10% (warning)
- Redis unreachable (critical)

### 6.9 Troubleshooting

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Bot not connecting | `make logs-bot` | Check REDIS_URL in .env |
| Dashboard unreachable | `make health` | Port 8080 conflict |
| Pipeline fails | `curl localhost:5000/api/pipelines/production-deploy/status` | Check Docker socket |
| High memory | Grafana dashboard | Increase limits in docker-compose.prod.yml |