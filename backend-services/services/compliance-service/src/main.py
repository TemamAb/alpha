"""
Alpha-Orion Compliance Service
Handles regulatory compliance checks including OFAC sanctions and Chainalysis screening
"""

import os
import asyncio
import httpx
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
from datetime import datetime, timedelta
import logging
from collections import defaultdict
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Alpha-Orion Compliance Service", version="1.0.0")

# Middleware for security monitoring
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """Middleware to log all requests for security monitoring"""
    client_ip = request.client.host if request.client else "unknown"
    response = await call_next(request)

    # Log access
    security_monitor.log_access(client_ip, str(request.url.path), request.method, response.status_code)

    return response

# Configuration
CHAINALYSIS_API_KEY = os.getenv("CHAINALYSIS_API_KEY")
CHAINALYSIS_BASE_URL = "https://api.chainalysis.com/api/kyt/v1"

OFAC_API_KEY = os.getenv("OFAC_API_KEY")  # If using a commercial OFAC API
OFAC_SANCTIONS_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml"  # Public OFAC list

# In-memory cache for sanctions lists
sanctions_cache = {}
CACHE_DURATION = timedelta(hours=24)

class AddressCheckRequest(BaseModel):
    address: str
    blockchain: str = "ethereum"
    asset: Optional[str] = None

class TransactionCheckRequest(BaseModel):
    from_address: str
    to_address: str
    amount: str
    asset: str
    blockchain: str = "ethereum"

class ComplianceResult(BaseModel):
    compliant: bool
    risk_score: float
    flags: List[str]
    details: Dict
    checked_at: datetime

class SanctionsList:
    """Manages OFAC sanctions list"""

    def __init__(self):
        self.sanctions = set()
        self.last_updated = None

    async def update_sanctions_list(self):
        """Fetch and update OFAC sanctions list"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(OFAC_SANCTIONS_URL)
                response.raise_for_status()

                # Parse XML and extract addresses
                # This is a simplified implementation
                # In production, use proper XML parsing and extract wallet addresses
                self.sanctions = self._parse_ofac_xml(response.text)
                self.last_updated = datetime.utcnow()
                logger.info(f"Updated OFAC sanctions list with {len(self.sanctions)} entries")

        except Exception as e:
            logger.error(f"Failed to update OFAC sanctions: {e}")

    def _parse_ofac_xml(self, xml_content: str) -> set:
        """Parse OFAC XML and extract relevant addresses"""
        # Simplified parsing - in production use proper XML parser
        addresses = set()

        # Look for ethereum addresses in the XML
        lines = xml_content.split('\n')
        for line in lines:
            if '0x' in line and len(line.split('0x')[1][:40]) == 40:
                addr = '0x' + line.split('0x')[1][:40]
                addresses.add(addr.lower())

        return addresses

    def is_sanctioned(self, address: str) -> bool:
        """Check if address is sanctioned"""
        if self.last_updated and datetime.utcnow() - self.last_updated > CACHE_DURATION:
            # Cache expired, but we'll check with current data
            pass

        return address.lower() in self.sanctions

# Initialize sanctions list
sanctions_list = SanctionsList()

class ChainalysisClient:
    """Client for Chainalysis KYT API"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = CHAINALYSIS_BASE_URL

    async def check_address(self, address: str, asset: str = None) -> Dict:
        """Check address risk using Chainalysis"""
        if not self.api_key:
            return {"risk": "unknown", "score": 0.5}

        try:
            headers = {"Token": self.api_key}
            params = {"address": address}
            if asset:
                params["asset"] = asset

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/address",
                    headers=headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()

        except Exception as e:
            logger.error(f"Chainalysis API error: {e}")
            return {"risk": "unknown", "score": 0.5}

    async def check_transaction(self, tx_hash: str) -> Dict:
        """Check transaction risk"""
        if not self.api_key:
            return {"risk": "unknown", "score": 0.5}

        try:
            headers = {"Token": self.api_key}

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/transaction/{tx_hash}",
                    headers=headers
                )
                response.raise_for_status()
                return response.json()

        except Exception as e:
            logger.error(f"Chainalysis transaction check error: {e}")
            return {"risk": "unknown", "score": 0.5}

# Initialize Chainalysis client
chainalysis = ChainalysisClient(CHAINALYSIS_API_KEY)

# Security monitoring
access_logs = defaultdict(list)
failed_auth_attempts = defaultdict(int)
transaction_patterns = defaultdict(list)
alerts = []

class SecurityMonitor:
    """Security monitoring and anomaly detection"""

    def __init__(self):
        self.suspicious_ips = set()
        self.failed_auth_threshold = 5
        self.transaction_anomaly_threshold = 2.0  # Standard deviations

    def log_access(self, ip: str, endpoint: str, method: str, status_code: int):
        """Log access attempt"""
        timestamp = datetime.utcnow()
        access_logs[ip].append({
            'timestamp': timestamp,
            'endpoint': endpoint,
            'method': method,
            'status_code': status_code
        })

        # Keep only last 1000 entries per IP
        if len(access_logs[ip]) > 1000:
            access_logs[ip] = access_logs[ip][-1000:]

        # Check for unusual access patterns
        self._check_access_patterns(ip)

    def log_failed_auth(self, ip: str):
        """Log failed authentication"""
        failed_auth_attempts[ip] += 1

        if failed_auth_attempts[ip] >= self.failed_auth_threshold:
            self._trigger_alert(f"Multiple failed auth attempts from IP: {ip}")
            self.suspicious_ips.add(ip)

    def log_transaction(self, amount: float, asset: str):
        """Log transaction for anomaly detection"""
        transaction_patterns[asset].append(amount)

        # Keep only last 1000 transactions per asset
        if len(transaction_patterns[asset]) > 1000:
            transaction_patterns[asset] = transaction_patterns[asset][-1000:]

        # Check for anomalies
        self._detect_transaction_anomaly(amount, asset)

    def _check_access_patterns(self, ip: str):
        """Check for unusual access patterns"""
        recent_logs = [log for log in access_logs[ip] if (datetime.utcnow() - log['timestamp']).seconds < 3600]

        # Check for high frequency access
        if len(recent_logs) > 100:
            self._trigger_alert(f"High frequency access from IP: {ip}")

        # Check for failed requests ratio
        failed_count = sum(1 for log in recent_logs if log['status_code'] >= 400)
        if len(recent_logs) > 10 and failed_count / len(recent_logs) > 0.8:
            self._trigger_alert(f"High error rate from IP: {ip}")

    def _detect_transaction_anomaly(self, amount: float, asset: str):
        """Detect anomalous transaction amounts"""
        if len(transaction_patterns[asset]) < 10:
            return

        try:
            mean = statistics.mean(transaction_patterns[asset])
            stdev = statistics.stdev(transaction_patterns[asset])

            if stdev > 0:
                z_score = abs(amount - mean) / stdev
                if z_score > self.transaction_anomaly_threshold:
                    self._trigger_alert(f"Anomalous transaction detected: {amount} {asset} (z-score: {z_score:.2f})")
        except statistics.StatisticsError:
            pass

    def _trigger_alert(self, message: str):
        """Trigger security alert"""
        alert = {
            'timestamp': datetime.utcnow(),
            'message': message,
            'severity': 'high'
        }
        alerts.append(alert)
        logger.warning(f"SECURITY ALERT: {message}")

        # Keep only last 100 alerts
        if len(alerts) > 100:
            alerts[:] = alerts[-100:]

    def get_security_stats(self):
        """Get security statistics"""
        return {
            'total_access_logs': sum(len(logs) for logs in access_logs.values()),
            'suspicious_ips': list(self.suspicious_ips),
            'failed_auth_attempts': dict(failed_auth_attempts),
            'active_alerts': len(alerts),
            'recent_alerts': alerts[-10:] if alerts else []
        }

# Initialize security monitor
security_monitor = SecurityMonitor()

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    await sanctions_list.update_sanctions_list()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "compliance"}

@app.post("/check-address", response_model=ComplianceResult)
async def check_address(request: AddressCheckRequest):
    """Check if an address is compliant"""
    flags = []
    risk_score = 0.0
    details = {}

    # Check OFAC sanctions
    if sanctions_list.is_sanctioned(request.address):
        flags.append("OFAC_SANCTIONED")
        risk_score = 1.0
        details["ofac"] = True
    else:
        details["ofac"] = False

    # Check Chainalysis risk
    chainalysis_result = await chainalysis.check_address(request.address, request.asset)
    chainalysis_risk = chainalysis_result.get("risk", "unknown")
    chainalysis_score = chainalysis_result.get("score", 0.5)

    if chainalysis_risk in ["high", "severe"]:
        flags.append(f"CHAINALYSIS_{chainalysis_risk.upper()}")
        risk_score = max(risk_score, 0.8)

    risk_score = max(risk_score, chainalysis_score)
    details["chainalysis"] = chainalysis_result

    compliant = risk_score < 0.7  # Threshold for compliance

    return ComplianceResult(
        compliant=compliant,
        risk_score=risk_score,
        flags=flags,
        details=details,
        checked_at=datetime.utcnow()
    )

@app.post("/check-transaction", response_model=ComplianceResult)
async def check_transaction(request: TransactionCheckRequest):
    """Check if a transaction is compliant"""
    flags = []
    risk_score = 0.0
    details = {}

    # Check both addresses
    from_check = await check_address(AddressCheckRequest(
        address=request.from_address,
        blockchain=request.blockchain,
        asset=request.asset
    ))

    to_check = await check_address(AddressCheckRequest(
        address=request.to_address,
        blockchain=request.blockchain,
        asset=request.asset
    ))

    # Aggregate results
    if not from_check.compliant:
        flags.extend([f"FROM_{flag}" for flag in from_check.flags])
        risk_score = max(risk_score, from_check.risk_score)

    if not to_check.compliant:
        flags.extend([f"TO_{flag}" for flag in to_check.flags])
        risk_score = max(risk_score, to_check.risk_score)

    details["from_address"] = from_check.dict()
    details["to_address"] = to_check.dict()

    compliant = risk_score < 0.7

    # Log transaction for anomaly detection
    try:
        amount = float(request.amount)
        security_monitor.log_transaction(amount, request.asset or "ETH")
    except ValueError:
        pass

    return ComplianceResult(
        compliant=compliant,
        risk_score=risk_score,
        flags=flags,
        details=details,
        checked_at=datetime.utcnow()
    )

@app.post("/update-sanctions")
async def update_sanctions():
    """Manually trigger sanctions list update"""
    await sanctions_list.update_sanctions_list()
    return {"message": "Sanctions list updated", "entries": len(sanctions_list.sanctions)}

@app.get("/sanctions-count")
async def get_sanctions_count():
    """Get current sanctions list count"""
    return {
        "count": len(sanctions_list.sanctions),
        "last_updated": sanctions_list.last_updated
    }

@app.get("/security/stats")
async def get_security_stats():
    """Get security monitoring statistics"""
    return security_monitor.get_security_stats()

@app.get("/security/alerts")
async def get_security_alerts():
    """Get recent security alerts"""
    return {"alerts": alerts[-50:] if alerts else []}

@app.post("/security/log-failed-auth")
async def log_failed_auth(request: Request):
    """Log failed authentication attempt"""
    client_ip = request.client.host if request.client else "unknown"
    security_monitor.log_failed_auth(client_ip)
    return {"message": "Failed auth logged"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
