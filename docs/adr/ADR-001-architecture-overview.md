# Architecture Decision Records

## ADR-001: Docker Compose for Local Production Orchestration

**Status**: Accepted
**Date**: 2026-04-02

### Context
The platform needs a production-grade local deployment that simulates the full multi-service architecture. The existing `docker-compose.yml` was minimal (3 services) and lacked monitoring, reverse proxy, and pipeline orchestration.

### Decision
Use Docker Compose v3.9 with 7 services: Nginx, Dashboard, Bot, Redis, Pipeline Engine, Prometheus, Grafana, Node Exporter.

### Rationale
- Docker Compose is the lowest-friction path to multi-service orchestration on localhost
- Adding Nginx as a reverse proxy provides unified routing and a single entry point
- Prometheus + Grafana provides production-grade monitoring without external dependencies
- The Pipeline Engine as a dedicated service enables CI/CD automation independent of GitHub Actions

### Consequences
- All services run on a single host (suitable for dev/staging, not HA production)
- Resource limits enforced via Docker `deploy.resources` to prevent host exhaustion
- Service discovery via Docker DNS on the `alpha-net` bridge network

---

## ADR-002: Nginx as Reverse Proxy (vs Traefik)

**Status**: Accepted
**Date**: 2026-04-02

### Context
Need a reverse proxy to unify routing across Dashboard, Pipeline Engine, Prometheus, and Grafana under a single port.

### Decision
Use Nginx (alpine) instead of Traefik.

### Rationale
- Nginx has a smaller footprint (alpine image ~40MB vs Traefik ~80MB)
- Explicit configuration via `nginx.conf` is more auditable than Traefik's label-based routing
- The platform doesn't need automatic TLS or dynamic service discovery (all services are statically defined)
- Nginx provides battle-tested WebSocket proxying for the dashboard's real-time updates

### Consequences
- Configuration changes require Nginx container reload
- No automatic Let's Encrypt integration (acceptable for localhost deployment)

---

## ADR-003: Dedicated Pipeline Engine Service

**Status**: Accepted
**Date**: 2026-04-02

### Context
The existing CI/CD is limited to a GitHub Actions workflow. We need local pipeline execution for build → test → stage → deploy with webhook triggers, rollback, and health checks.

### Decision
Build a Python/Flask-based Pipeline Engine service running on port 5000.

### Rationale
- Decouples pipeline orchestration from GitHub (works offline, works with any git host)
- Enables webhook-triggered and manual pipeline execution
- Rollback is a first-class operation
- Pipeline state is persisted to Redis for cross-service visibility
- The Flask + Gunicorn stack is lightweight and Python-native (consistent with the bot's tech stack)

### Consequences
- Pipeline Engine requires Docker socket access (`/var/run/docker.sock`) to manage container lifecycle
- This is a security consideration: in multi-tenant environments, socket access should be restricted

---

## ADR-004: Redis as Central Message Bus and State Store

**Status**: Accepted (existing decision, documented here)

### Context
The platform uses Redis for inter-service communication (bot ↔ dashboard), nonce coordination, runtime config sync, and heartbeat tracking.

### Decision
Continue using Redis 7 as the central message bus. In production Docker Compose, run a local Redis instance with AOF persistence.

### Rationale
- The existing codebase deeply integrates Redis pub/sub (`alphamark:control`, `alphamark:config`, `alphamark:updates`)
- Redis provides atomic nonce pipelining for EIP-4337 smart account operations
- Local Redis eliminates external Upstash dependency for local production simulation

### Consequences
- Local Redis has no replication (acceptable for single-host deployment)
- For production cloud deployment, externalize Redis to Upstash/Redis Cloud

---

## ADR-005: Prometheus + Grafana for Observability

**Status**: Accepted
**Date**: 2026-04-02

### Context
The platform lacks centralized monitoring and alerting. Logs are scattered across container stdout.

### Decision
Deploy Prometheus for metrics collection and Grafana for dashboarding, with pre-configured alert rules.

### Rationale
- Industry standard for container-based infrastructure
- Node Exporter provides host-level metrics (CPU, memory, disk, network)
- Pre-built Grafana dashboards provide immediate visibility
- Alert rules for service downtime, resource exhaustion, and Redis health

### Consequences
- Adds 2 additional containers (~200MB combined memory)
- Metrics retention set to 7 days (configurable)
