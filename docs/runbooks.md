# Alpha-Orion Runbooks

## Deployment Runbook

### Prerequisites
- GCP project with necessary permissions
- Docker installed
- Terraform installed
- GitHub repository access

### Steps
1. Clone repository
2. Configure environment variables in `.env`
3. Run `terraform init` and `terraform apply`
4. Build and push Docker images
5. Deploy to Cloud Run/Kubernetes

## Monitoring Runbook

### Health Checks
- All services expose `/health` endpoint
- Monitor via Cloud Monitoring dashboards
- Alert on 5xx errors or high latency

### Logs
- Centralized logging via Google Cloud Logging
- Search logs by service name and severity

### Metrics
- Custom metrics for PNL, order volume, risk levels
- Dashboards in Cloud Monitoring

## Incident Response

### High Risk Alert
1. Pause trading via orchestrator
2. Investigate logs and metrics
3. Rollback if necessary
4. Resume after mitigation

### Service Down
1. Check Cloud Run/K8s status
2. Restart service
3. Investigate root cause
4. Update monitoring if needed

## Backup and Recovery

### Database Backup
- Automated daily backups via GCP
- Point-in-time recovery available

### Code Backup
- GitHub repository
- Tagged releases for production

## Scaling Runbook

### Horizontal Scaling
- Increase replica count in Terraform
- Monitor resource usage

### Vertical Scaling
- Adjust CPU/memory limits
- Monitor performance metrics