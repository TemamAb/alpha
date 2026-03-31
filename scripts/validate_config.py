#!/usr/bin/env python3
"""
Configuration Validation Script
Validates that all deployment configuration files use consistent and safe defaults.
"""

import os
import sys
import json
import re
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

def check_render_yaml():
    """Check render.yaml for safe PAPER_TRADING_MODE default."""
    render_path = PROJECT_ROOT / "render.yaml"
    if not render_path.exists():
        return False, "render.yaml not found"
    
    content = render_path.read_text()
    
    # Check for PAPER_TRADING_MODE = false (unsafe)
    if 'value: "false"' in content and 'PAPER_TRADING_MODE' in content:
        # Count occurrences
        false_count = content.count('PAPER_TRADING_MODE')
        false_value_count = content.count('value: "false"')
        
        # If we find PAPER_TRADING_MODE with value: "false", it's unsafe
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'PAPER_TRADING_MODE' in line:
                # Check next line for value
                if i + 1 < len(lines) and 'value: "false"' in lines[i + 1]:
                    return False, f"render.yaml has PAPER_TRADING_MODE=false (line {i+2}). Should be 'true' for safety."
    
    return True, "render.yaml: PAPER_TRADING_MODE defaults are safe"

def check_docker_compose():
    """Check docker-compose.yml for safe PAPER_TRADING_MODE default."""
    compose_path = PROJECT_ROOT / "docker-compose.yml"
    if not compose_path.exists():
        return False, "docker-compose.yml not found"
    
    content = compose_path.read_text()
    
    # Check for PAPER_TRADING_MODE with default true
    if 'PAPER_TRADING_MODE=${PAPER_TRADING_MODE:-true}' in content:
        return True, "docker-compose.yml: PAPER_TRADING_MODE defaults to true (safe)"
    elif 'PAPER_TRADING_MODE=${PAPER_TRADING_MODE:-false}' in content:
        return False, "docker-compose.yml: PAPER_TRADING_MODE defaults to false (unsafe)"
    else:
        return False, "docker-compose.yml: PAPER_TRADING_MODE default not found or unclear"

def check_dockerfile_bot():
    """Check Dockerfile.bot for safe PAPER_TRADING_MODE default."""
    dockerfile_path = PROJECT_ROOT / "Dockerfile.bot"
    if not dockerfile_path.exists():
        return False, "Dockerfile.bot not found"
    
    content = dockerfile_path.read_text()
    
    # Check for ENV PAPER_TRADING_MODE=true
    if 'ENV PAPER_TRADING_MODE=true' in content:
        return True, "Dockerfile.bot: PAPER_TRADING_MODE=true (safe)"
    elif 'ENV PAPER_TRADING_MODE=false' in content:
        return False, "Dockerfile.bot: PAPER_TRADING_MODE=false (unsafe)"
    else:
        return False, "Dockerfile.bot: PAPER_TRADING_MODE not set"

def check_hardcoded_credentials():
    """Check for hardcoded credentials in key files."""
    issues = []
    
    # Check executor.py for DEFAULT_LOCAL_KEY
    executor_path = PROJECT_ROOT / "execution_bot" / "scripts" / "executor.py"
    if executor_path.exists():
        content = executor_path.read_text()
        if 'DEFAULT_LOCAL_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"' in content:
            issues.append("executor.py: Hardcoded DEFAULT_LOCAL_KEY found")
    
    # Check preflight_check.py for hardcoded Biconomy key
    preflight_path = PROJECT_ROOT / "execution_bot" / "scripts" / "preflight_check.py"
    if preflight_path.exists():
        content = preflight_path.read_text()
        if 'biconomy_key = os.environ.get("BICONOMY_API_KEY") or "mee_3ZUAvWL62BBVb2EjVPZwNUaF"' in content:
            issues.append("preflight_check.py: Hardcoded Biconomy API key fallback")
    
    if issues:
        return False, "; ".join(issues)
    return True, "No hardcoded credentials found"

def check_silent_exception_handling():
    """Check for silent exception handling (except: pass)."""
    issues = []
    
    # Check bot.py
    bot_path = PROJECT_ROOT / "execution_bot" / "scripts" / "bot.py"
    if bot_path.exists():
        content = bot_path.read_text()
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'except:' in line and i + 1 < len(lines) and 'pass' in lines[i + 1]:
                issues.append(f"bot.py line {i+1}: Silent exception handling (except: pass)")
    
    if issues:
        return False, "; ".join(issues)
    return True, "No silent exception handling found"

def main():
    """Run all configuration validation checks."""
    print("🔍 AlphaMarkA Configuration Validation")
    print("=" * 50)
    
    checks = [
        ("render.yaml", check_render_yaml),
        ("docker-compose.yml", check_docker_compose),
        ("Dockerfile.bot", check_dockerfile_bot),
        ("Hardcoded Credentials", check_hardcoded_credentials),
        ("Silent Exception Handling", check_silent_exception_handling),
    ]
    
    all_passed = True
    results = []
    
    for name, check_func in checks:
        try:
            passed, message = check_func()
            status = "✅ PASS" if passed else "❌ FAIL"
            results.append((name, passed, message))
            print(f"{status}: {name}")
            print(f"   {message}")
            if not passed:
                all_passed = False
        except Exception as e:
            results.append((name, False, f"Error: {str(e)}"))
            print(f"❌ ERROR: {name}")
            print(f"   {str(e)}")
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✅ All configuration checks passed!")
        return 0
    else:
        print("❌ Some configuration checks failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
