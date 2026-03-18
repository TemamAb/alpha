#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
import os
import shutil

def run_command(command):
    """Runs a shell command and returns the output."""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return None
    except FileNotFoundError:
        return None

def check_gcloud():
    """Checks if gcloud is installed and authenticated."""
    if not shutil.which("gcloud"):
        return False, "gcloud CLI not found"
    
    account = run_command("gcloud auth list --filter=status:ACTIVE --format='value(account)'")
    if not account:
        return False, "Not authenticated with gcloud"
    
    return True, f"Authenticated as {account}"

def check_apis(project_id):
    """Checks if required APIs are enabled."""
    required_apis = [
        "run.googleapis.com",
        "cloudbuild.googleapis.com",
        "secretmanager.googleapis.com",
        "container.googleapis.com",
        "redis.googleapis.com"
    ]
    
    enabled_apis_output = run_command(f"gcloud services list --enabled --project={project_id} --format='value(config.name)'")
    if not enabled_apis_output:
        return [], "Failed to retrieve enabled APIs"

    enabled_apis = enabled_apis_output.split()
    missing = [api for api in required_apis if api not in enabled_apis]
    
    return missing, None

def check_secrets(project_id):
    """Checks if required secrets exist."""
    required_secrets = [
        "DATABASE_URL",
        "REDIS_URL", 
        "PIMLICO_API_KEY",
        "ONE_INCH_API_KEY"
    ]
    
    # gcloud secrets list returns full resource names: projects/ID/secrets/NAME
    secrets_output = run_command(f"gcloud secrets list --project={project_id} --format='value(name)'")
    if secrets_output is None:
        return required_secrets # Assume all missing if command fails
        
    existing_secrets = secrets_output.split()
    # Extract just the secret name from the full path
    existing_names = [s.split('/')[-1] for s in existing_secrets]
    
    missing = [s for s in required_secrets if s not in existing_names]
    return missing

def main():
    parser = argparse.ArgumentParser(description="Alpha-Orion GCP Deployment Diagnostics")
    parser.add_argument("--project", default="alpha-orion", help="GCP Project ID")
    parser.add_argument("--diagnose-only", action="store_true", help="Run diagnostics only")
    args = parser.parse_args()
    
    project_id = args.project
    issues = []
    readiness = "UNKNOWN"
    
    print(f"🔍 Running Diagnostics for Project: {project_id}")
    print("-" * 50)

    # 1. Auth Check
    is_auth, auth_msg = check_gcloud()
    if is_auth:
        print(f"✅ {auth_msg}")
    else:
        print(f"❌ {auth_msg}")
        issues.append(auth_msg)
        readiness = "BLOCKED"
        save_report(readiness, issues)
        return

    # 2. Project Check
    current_project = run_command("gcloud config get-value project")
    if current_project != project_id:
        print(f"⚠️  Current project is '{current_project}'. Switching to '{project_id}'...")
        run_command(f"gcloud config set project {project_id}")
    else:
        print(f"✅ Project set to {project_id}")

    # 3. API Check
    print("⏳ Checking APIs...")
    missing_apis, api_err = check_apis(project_id)
    if api_err:
        print(f"❌ {api_err}")
        issues.append(api_err)
    elif missing_apis:
        print(f"❌ Missing APIs: {', '.join(missing_apis)}")
        issues.append(f"Missing APIs: {', '.join(missing_apis)}")
    else:
        print("✅ Required APIs enabled")

    # 4. Secret Check
    print("⏳ Checking Secrets...")
    missing_secrets = check_secrets(project_id)
    if missing_secrets:
        print(f"⚠️  Missing Secrets: {', '.join(missing_secrets)}")
        issues.append(f"Missing Secrets: {', '.join(missing_secrets)}")
    else:
        print("✅ Required Secrets configured")

    # 5. File Check
    if not os.path.exists("official-dashboard.html"):
        print("❌ Missing 'official-dashboard.html'")
        issues.append("Missing official-dashboard.html")
    else:
        print("✅ official-dashboard.html found")

    # Determine Readiness
    if not issues:
        readiness = "READY"
        print("\n🎉 System is READY for deployment.")
    else:
        critical_issues = [i for i in issues if "API" in i or "Auth" in i or "gcloud" in i]
        if critical_issues:
            readiness = "BLOCKED"
            print("\n🚫 Deployment BLOCKED by critical issues.")
        else:
            readiness = "CAUTION"
            print("\n⚠️  Deployment ready with CAUTIONS (Secrets may be missing).")

    save_report(readiness, issues)

def save_report(readiness, issues):
    report = {
        "deployment_readiness": readiness,
        "issues": issues,
        "timestamp": "2024-01-01T00:00:00Z"
    }
    with open("gcp-deployment-fix-report.json", "w") as f:
        json.dump(report, f, indent=2)
    print(f"📄 Report saved to gcp-deployment-fix-report.json")

if __name__ == "__main__":
    main()