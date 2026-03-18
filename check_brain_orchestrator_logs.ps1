# check_brain_orchestrator_logs.ps1
# Fetches recent logs for the Brain Orchestrator service

# Use 'Stop' to ensure the script exits on errors, providing clearer failure signals.
$ErrorActionPreference = "Stop"
Write-Host "Fetching last 30 log entries for Brain Orchestrator..." -ForegroundColor Cyan

$ServiceName = "brain-orchestrator"
$ProjectID = "alpha-orion-485207"
$Region = "us-central1"

# Fetch logs using gcloud logging. Added 'severity>=ERROR' to focus on critical issues during debugging.
# The format now includes severity for better context.
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$ServiceName AND resource.labels.location=$Region AND severity>=ERROR" `
  --project $ProjectID `
  --limit=30 `
  --format="table(timestamp, severity, textPayload, jsonPayload.message)" `
  --order=desc
