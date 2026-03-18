"""
Alpha-Orion Compliance Engine
Phase 5: Institutional-Grade Compliance Framework

Provides:
- AML/KYC Integration
- Transaction Monitoring
- Audit Trail System
- SAR Filing Automation
- Regulatory Reporting
"""

import asyncio
import logging
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple
from hashlib import sha256
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RiskTier(Enum):
    """KYC/AML Risk Tiers"""
    TIER_0 = "UNVERIFIED"      # No KYC
    TIER_1 = "BASIC"           # Email/Phone only
    TIER_2 = "STANDARD"        # ID verification
    TIER_3 = "ENHANCED"        # Enhanced due diligence
    TIER_4 = "INSTITUTIONAL"   # Full institutional KYC


class AlertSeverity(Enum):
    """Alert severity levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertType(Enum):
    """Types of compliance alerts"""
    LARGE_TRANSACTION = "LARGE_TRANSACTION"
    UNUSUAL_PATTERN = "UNUSUAL_PATTERN"
    SANCTIONS_HIT = "SANCTIONS_HIT"
    VELOCITY_BREACH = "VELOCITY_BREACH"
    STRUCTURING = "STRUCTURING"
    SANDBOXING = "SANDBOXING"


@dataclass
class UserProfile:
    """User compliance profile"""
    wallet_address: str
    risk_tier: RiskTier = RiskTier.TIER_0
    kyc_verified: bool = False
    kyc_timestamp: Optional[datetime] = None
    aml_status: str = "PENDING"
    country: str = "UNKNOWN"
    is_institution: bool = False
    wallet_age_days: int = 0
    previous_violations: int = 0
    risk_score: float = 50.0  # 0-100
    tags: List[str] = field(default_factory=list)
    
    @property
    def is_compliant(self) -> bool:
        return self.kyc_verified and self.risk_tier in [
            RiskTier.TIER_2, RiskTier.TIER_3, RiskTier.TIER_4
        ]


@dataclass
class TransactionRecord:
    """Immutable transaction record for audit trail"""
    tx_hash: str
    timestamp: datetime
    wallet_address: str
    direction: str  # IN, OUT, INTERNAL
    token: str
    amount_usd: float
    from_address: str
    to_address: str
    gas_used: int
    gas_price_gwei: int
    block_number: int
    risk_score: float
    compliance_status: str
    metadata: Dict = field(default_factory=dict)
    
    @property
    def hash(self) -> str:
        """Generate content hash for immutability verification"""
        content = f"{self.tx_hash}{self.timestamp.isoformat()}{self.wallet_address}"
        return sha256(content.encode()).hexdigest()


@dataclass
class ComplianceAlert:
    """Compliance alert record"""
    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    wallet_address: str
    tx_hash: str
    description: str
    timestamp: datetime
    status: str = "OPEN"  # OPEN, INVESTIGATING, RESOLVED, ESCALATED
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None
    resolution_timestamp: Optional[datetime] = None
    
    @property
    def sar_required(self) -> bool:
        """Check if SAR filing is required"""
        return self.severity in [AlertSeverity.HIGH, AlertSeverity.CRITICAL]


class ChainalysisIntegration:
    """
    Chainalysis AML Integration
    Real-time blockchain analytics and sanctions screening
    """
    
    # Chainalysis screening result categories
    SCREENING_RESULTS = {
        "CLEAR": "No risk indicators",
        "WARNING": "Moderate risk - review recommended",
        "ALERT": "High risk - manual review required",
        "BLOCK": "Prohibited - do not transact"
    }
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.screening_cache: Dict[str, Dict] = {}
        self.last_screening: Dict[str, datetime] = {}
        
        logger.info("ChainalysisIntegration initialized")
    
    async def screen_address(self, address: str) -> Dict:
        """
        Screen an address against sanctions lists and risk databases.
        
        Returns:
            Dict with:
            - risk_rating: 0-100
            - category: CLEAR/WARNING/ALERT/BLOCK
            - risk_factors: List of specific concerns
            - last_updated: Timestamp
        """
        # Check cache (valid for 1 hour)
        if address in self.screening_cache:
            cache_time = self.last_screening.get(address)
            if cache_time and (datetime.utcnow() - cache_time) < timedelta(hours=1):
                return self.screening_cache[address]
        
        # In production, call Chainalysis API:
        # response = requests.post(
        #     "https://api.chainalysis.com/api/kyt/v2/users/{address}",
        #     headers={"Authorization": f"Bearer {self.api_key}"}
        # )
        
        # Placeholder implementation
        result = {
            "risk_rating": 15,  # Low risk
            "category": "CLEAR",
            "risk_factors": [],
            "sanctions_hits": [],
            "last_updated": datetime.utcnow().isoformat(),
            "cluster_id": f"cluster_{address[:8]}",
            "direct_exposure": {"category": "unknown", "percent": 0},
            "indirect_exposure": {"category": "unknown", "percent": 0}
        }
        
        self.screening_cache[address] = result
        self.last_screening[address] = datetime.utcnow()
        
        return result
    
    async def screen_transaction(self, tx_hash: str) -> Dict:
        """Screen a transaction for AML risks"""
        # In production, use Chainalysis Reactor API
        return {
            "tx_hash": tx_hash,
            "risk_rating": 10,
            "category": "CLEAR",
            "direct_wallets": [],
            "risk_indicators": []
        }


class TRMLabsIntegration:
    """
    TRM Labs Integration
    Additional AML screening and fraud detection
    """
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.wallet_cache: Dict[str, Dict] = {}
        
        logger.info("TRMLabsIntegration initialized")
    
    async def assess_wallet(self, address: str) -> Dict:
        """
        Comprehensive wallet risk assessment.
        
        Returns:
            Dict with risk scores for:
            - Counterparty risk
            - Fraud risk
            - Money laundering risk
            - Sanctions exposure
        """
        # Placeholder - in production use TRM API
        return {
            "address": address,
            "overall_score": 12,  # Low risk
            "counterparty_risk": 8,
            "fraud_risk": 5,
            "aml_risk": 10,
            "sanctions_risk": 0,
            "labels": ["defi_user", "long_standing"],
            "first_seen": "2021-01-15",
            "transaction_count": 150,
            "total_volume_usd": 50000
        }


class TransactionMonitor:
    """
    Real-time transaction monitoring for suspicious activity.
    """
    
    # Thresholds
    LARGE_TRANSACTION_THRESHOLD = 10000  # $10K USD
    VELOCITY_WINDOW_HOURS = 24
    VELOCITY_MAX_TRANSACTIONS = 10
    VELOCITY_MAX_VOLUME = 50000  # $50K in 24h
    
    def __init__(self):
        self.transaction_history: List[TransactionRecord] = []
        self.alert_rules: Dict[str, Dict] = self._default_rules()
        self.chainalysis = ChainalysisIntegration()
        self.trm = TRMLabsIntegration()
        
        logger.info("TransactionMonitor initialized")
    
    def _default_rules(self) -> Dict:
        """Default monitoring rules"""
        return {
            "large_transaction": {
                "threshold_usd": 10000,
                "severity": AlertSeverity.MEDIUM,
                "enabled": True
            },
            "velocity": {
                "max_transactions_per_day": 10,
                "max_volume_per_day_usd": 50000,
                "severity": AlertSeverity.HIGH,
                "enabled": True
            },
            "structuring": {
                "threshold_usd": 9000,  # Just under $10K reporting threshold
                "time_window_hours": 24,
                "severity": AlertSeverity.CRITICAL,
                "enabled": True
            },
            "sanctions": {
                "severity": AlertSeverity.CRITICAL,
                "enabled": True
            }
        }
    
    async def monitor_transaction(
        self,
        tx: TransactionRecord
    ) -> List[ComplianceAlert]:
        """
        Monitor a transaction and generate alerts if needed.
        
        Returns:
            List of generated alerts (empty if no issues)
        """
        alerts = []
        
        # Store transaction
        self.transaction_history.append(tx)
        
        # Run screening
        screening = await self.chainalysis.screen_address(tx.wallet_address)
        trm_assessment = await self.trm.assess_wallet(tx.wallet_address)
        
        # Update tx risk score
        tx.risk_score = max(tx.risk_score, screening.get("risk_rating", 0))
        tx.risk_score = max(tx.risk_score, trm_assessment.get("overall_score", 0))
        
        # Check rules
        if screening.get("category") == "BLOCK":
            alerts.append(ComplianceAlert(
                alert_id=self._generate_alert_id(),
                alert_type=AlertType.SANCTIONS_HIT,
                severity=AlertSeverity.CRITICAL,
                wallet_address=tx.wallet_address,
                tx_hash=tx.tx_hash,
                description=f"Sanctions hit: {screening.get('risk_factors', [])}"
            ))
        
        if tx.amount_usd >= self.alert_rules["large_transaction"]["threshold_usd"]:
            alerts.append(ComplianceAlert(
                alert_id=self._generate_alert_id(),
                alert_type=AlertType.LARGE_TRANSACTION,
                severity=AlertSeverity.MEDIUM,
                wallet_address=tx.wallet_address,
                tx_hash=tx.tx_hash,
                description=f"Large transaction: ${tx.amount_usd:,.2f}"
            ))
        
        # Check velocity
        recent_txs = self._get_recent_transactions(tx.wallet_address)
        recent_volume = sum(t.amount_usd for t in recent_txs)
        
        if len(recent_txs) >= self.alert_rules["velocity"]["max_transactions_per_day"]:
            alerts.append(ComplianceAlert(
                alert_id=self._generate_alert_id(),
                alert_type=AlertType.VELOCITY_BREACH,
                severity=AlertSeverity.HIGH,
                wallet_address=tx.wallet_address,
                tx_hash=tx.tx_hash,
                description=f"High velocity: {len(recent_txs)} transactions in 24h"
            ))
        
        # Check for structuring
        near_threshold = [t for t in recent_txs 
                         if 9000 <= t.amount_usd < 10000]
        if len(near_threshold) >= 2:
            alerts.append(ComplianceAlert(
                alert_id=self._generate_alert_id(),
                alert_type=AlertType.STRUCTURING,
                severity=AlertSeverity.CRITICAL,
                wallet_address=tx.wallet_address,
                tx_hash=tx.tx_hash,
                description=f"Potential structuring: {len(near_threshold)} near-$10K transactions"
            ))
        
        # Update compliance status
        if alerts:
            tx.compliance_status = "FLAGGED"
        else:
            tx.compliance_status = "CLEAR"
        
        logger.info(f"Monitored transaction {tx.tx_hash[:16]}... - {tx.compliance_status}")
        
        return alerts
    
    def _get_recent_transactions(
        self,
        wallet_address: str,
        hours: int = 24
    ) -> List[TransactionRecord]:
        """Get recent transactions for a wallet"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        return [
            tx for tx in self.transaction_history
            if tx.wallet_address == wallet_address
            and tx.timestamp >= cutoff
        ]
    
    def _generate_alert_id(self) -> str:
        """Generate unique alert ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        random_suffix = hashlib.md5(f"{timestamp}".encode()).hexdigest()[:6]
        return f"ALERT-{timestamp}-{random_suffix}"


class AuditTrail:
    """
    Immutable audit trail for all system actions.
    Uses blockchain-like hashing for tamper detection.
    """
    
    def __init__(self):
        self.chain: List[Dict] = []
        self.pending_batch: List[Dict] = []
        self.batch_size = 100
        self.batch_timeout_seconds = 300  # 5 minutes
        
        logger.info("AuditTrail initialized")
    
    def record_action(
        self,
        action_type: str,
        actor: str,
        target: str,
        details: Dict = None,
        metadata: Dict = None
    ) -> str:
        """
        Record an action in the audit trail.
        
        Returns:
            Record hash for verification
        """
        timestamp = datetime.utcnow()
        
        record = {
            "timestamp": timestamp.isoformat(),
            "action_type": action_type,
            "actor": actor,
            "target": target,
            "details": details or {},
            "metadata": metadata or {
                "version": "1.0",
                "chain_id": "alpha-orion-main"
            }
        }
        
        # Generate hash (includes previous hash for chain)
        if self.chain:
            prev_hash = self.chain[-1]["hash"]
        else:
            prev_hash = "0" * 64
        
        record["previous_hash"] = prev_hash
        record["hash"] = self._compute_hash(record)
        
        self.pending_batch.append(record)
        
        # Flush if batch is full or timeout reached
        if len(self.pending_batch) >= self.batch_size:
            self._flush_batch()
        
        return record["hash"]
    
    def _compute_hash(self, record: Dict) -> str:
        """Compute SHA-256 hash of a record"""
        content = json.dumps(record, sort_keys=True)
        return sha256(content.encode()).hexdigest()
    
    def _flush_batch(self):
        """Flush pending batch to main chain"""
        self.chain.extend(self.pending_batch)
        self.pending_batch = []
        logger.info(f"Flushed audit batch: {len(self.chain)} total records")
    
    def verify_integrity(self) -> Tuple[bool, List[Dict]]:
        """
        Verify audit trail integrity.
        
        Returns:
            Tuple[is_valid, list_of_invalid_records]
        """
        invalid = []
        
        for i, record in enumerate(self.chain):
            # Verify hash
            expected_hash = self._compute_hash({
                k: v for k, v in record.items() 
                if k != "hash"
            })
            
            if record["hash"] != expected_hash:
                invalid.append({
                    "index": i,
                    "reason": "Hash mismatch",
                    "hash": record["hash"]
                })
            
            # Verify chain
            if i > 0 and record["previous_hash"] != self.chain[i-1]["hash"]:
                invalid.append({
                    "index": i,
                    "reason": "Chain break",
                    "previous_hash": record["previous_hash"]
                })
        
        return len(invalid) == 0, invalid
    
    def get_records(
        self,
        actor: str = None,
        action_type: str = None,
        start_time: datetime = None,
        end_time: datetime = None,
        limit: int = 1000
    ) -> List[Dict]:
        """Query audit records with filters"""
        results = self.chain
        
        if actor:
            results = [r for r in results if r["actor"] == actor]
        
        if action_type:
            results = [r for r in results if r["action_type"] == action_type]
        
        if start_time:
            results = [r for r in results 
                      if datetime.fromisoformat(r["timestamp"]) >= start_time]
        
        if end_time:
            results = [r for r in results 
                      if datetime.fromisoformat(r["timestamp"]) <= end_time]
        
        return results[-limit:]


class SARFilingSystem:
    """
    Suspicious Activity Report (SAR) Filing System
    Automated SAR generation and filing workflow
    """
    
    # SAR filing thresholds
    SAR_THRESHOLD_CASH = 5000  # $5K for cash transactions
    SAR_THRESHOLD_STRUCTURING = 2000  # Any structuring activity
    SAR_THRESHOLD_SANCTIONS = 0  # Always for sanctions
    
    def __init__(self):
        self.sar_queue: List[Dict] = []
        self.filed_sars: List[Dict] = []
        self.draft_sars: List[Dict] = []
        
        logger.info("SARFilingSystem initialized")
    
    async def generate_sar(
        self,
        alert: ComplianceAlert,
        transactions: List[TransactionRecord],
        user_profile: UserProfile
    ) -> Dict:
        """
        Generate a Suspicious Activity Report.
        
        Returns:
            SAR document dictionary
        """
        sar = {
            "sar_id": f"SAR-{datetime.utcnow().strftime('%Y%m%d')}-{self._generate_id()}",
            "filing_date": datetime.utcnow().isoformat(),
            "report_status": "DRAFT",
            
            # Subject Information
            "subject": {
                "wallet_address": alert.wallet_address,
                "risk_tier": user_profile.risk_tier.value,
                "kyc_status": user_profile.kyc_verified,
                "country": user_profile.country,
                "is_institution": user_profile.is_institution
            },
            
            # Narrative
            "narrative": {
                "summary": f"SAR filed for {alert.alert_type.value} - {alert.description}",
                "full_description": self._generate_narrative(alert, transactions),
                "suspicious_activity_type": self._map_alert_to_sar_type(alert.alert_type)
            },
            
            # Transaction Details
            "transactions": [
                {
                    "tx_hash": tx.tx_hash,
                    "timestamp": tx.timestamp.isoformat(),
                    "amount_usd": tx.amount_usd,
                    "token": tx.token,
                    "direction": tx.direction
                }
                for tx in transactions
            ],
            
            # Filing Information
            "filing_info": {
                "filing_institution": "Alpha-Orion",
                "contact_name": "Compliance Officer",
                "contact_phone": "+1-XXX-XXX-XXXX",
                "contact_email": "compliance@alpha-orion.io",
                "branch_id": "HEADQUARTERS"
            },
            
            # Associated Alerts
            "associated_alerts": [alert.alert_id],
            
            # Review Information
            "review": {
                "analyst": None,
                "review_date": None,
                "determination": None,
                "notes": None
            }
        }
        
        self.draft_sars.append(sar)
        
        logger.info(f"Generated SAR: {sar['sar_id']}")
        
        return sar
    
    async def file_sar(self, sar_id: str) -> bool:
        """
        File a SAR (move from draft to filed).
        
        In production, this would submit to FinCEN or equivalent.
        """
        for i, sar in enumerate(self.draft_sars):
            if sar["sar_id"] == sar_id:
                sar["report_status"] = "FILED"
                sar["filed_date"] = datetime.utcnow().isoformat()
                self.filed_sars.append(sar)
                self.draft_sars.pop(i)
                
                logger.info(f"Filed SAR: {sar_id}")
                return True
        
        return False
    
    async def escalate_sar(self, sar_id: str, notes: str) -> bool:
        """Escalate a SAR for senior review"""
        for sar in self.filed_sars:
            if sar["sar_id"] == sar_id:
                sar["report_status"] = "ESCALATED"
                sar["escalation_notes"] = notes
                sar["escalation_date"] = datetime.utcnow().isoformat()
                
                logger.info(f"Escalated SAR: {sar_id}")
                return True
        
        return False
    
    def _generate_narrative(
        self,
        alert: ComplianceAlert,
        transactions: List[TransactionRecord]
    ) -> str:
        """Generate detailed narrative for SAR"""
        narrative = f"""
SUBJECT: {alert.wallet_address}
ALERT TYPE: {alert.alert_type.value}
SEVERITY: {alert.severity.value}

TIMELINE OF ACTIVITY:
"""
        for tx in transactions:
            narrative += f"- {tx.timestamp}: {tx.direction} {tx.amount_usd} {tx.token}\n"
        
        narrative += f"""
SUSPICIOUS ACTIVITY INDICATORS:
- Alert triggered: {alert.description}
- Risk level: {alert.severity.value}

RECOMMENDATION:
{'Immediate filing required due to high severity' if alert.sar_required else 'Filing recommended based on patterns detected'}
"""
        return narrative
    
    def _map_alert_to_sar_type(self, alert_type: AlertType) -> str:
        """Map alert type to SAR activity type"""
        mapping = {
            AlertType.SANCTIONS_HIT: "Sanctions violations",
            AlertType.STRUCTURING: "Structuring/smurfing",
            AlertType.VELOCITY_BREACH: "Rapid movement of funds",
            AlertType.LARGE_TRANSACTION: "Large transaction reporting",
            AlertType.UNUSUAL_PATTERN: "Unusual activity patterns"
        }
        return mapping.get(alert_type.value, "Other suspicious activity")
    
    def _generate_id(self) -> str:
        """Generate unique ID"""
        return hashlib.md5(f"{datetime.utcnow()}".encode()).hexdigest()[:8]


class ComplianceManager:
    """
    Main compliance orchestration.
    Combines all compliance components.
    """
    
    def __init__(self):
        self.chainalysis = ChainalysisIntegration()
        self.transaction_monitor = TransactionMonitor()
        self.audit_trail = AuditTrail()
        self.sar_system = SARFilingSystem()
        
        # User profiles cache
        self.user_profiles: Dict[str, UserProfile] = {}
        
        logger.info("ComplianceManager initialized")
    
    async def check_compliance(
        self,
        wallet_address: str,
        transaction: TransactionRecord
    ) -> Tuple[bool, List[str]]:
        """
        Check if a transaction is compliant.
        
        Returns:
            Tuple[is_compliant, list_of_issues]
        """
        issues = []
        
        # Screen wallet
        screening = await self.chainalysis.screen_address(wallet_address)
        
        if screening.get("category") == "BLOCK":
            issues.append("Wallet blocked by sanctions screening")
        
        if screening.get("risk_rating") > 80:
            issues.append(f"High risk wallet: {screening.get('risk_rating')}")
        
        # Check user profile
        profile = self.user_profiles.get(wallet_address)
        if profile and not profile.is_compliant:
            issues.append("User not KYC verified for transaction size")
        
        # Record in audit trail
        self.audit_trail.record_action(
            action_type="COMPLIANCE_CHECK",
            actor="system",
            target=wallet_address,
            details={
                "tx_hash": transaction.tx_hash,
                "screening_result": screening.get("category"),
                "issues": issues
            }
        )
        
        return len(issues) == 0, issues
    
    async def process_transaction(
        self,
        tx: TransactionRecord
    ) -> Tuple[bool, str, List[ComplianceAlert]]:
        """
        Process a transaction through compliance pipeline.
        
        Returns:
            Tuple[is_approved, status_message, alerts_generated]
        """
        # Check compliance
        is_compliant, issues = await self.check_compliance(tx.wallet_address, tx)
        
        if not is_compliant:
            tx.compliance_status = "REJECTED"
            return False, f"Rejected: {', '.join(issues)}", []
        
        # Monitor for suspicious activity
        alerts = await self.transaction_monitor.monitor_transaction(tx)
        
        # Record in audit trail
        self.audit_trail.record_action(
            action_type="TRANSACTION_PROCESSED",
            actor=tx.wallet_address,
            target=tx.tx_hash,
            details={
                "amount_usd": tx.amount_usd,
                "token": tx.token,
                "alerts_generated": len(alerts),
                "compliance_status": tx.compliance_status
            }
        )
        
        # Generate SARs if needed
        for alert in alerts:
            if alert.sar_required:
                profile = self.user_profiles.get(tx.wallet_address, UserProfile(tx.wallet_address))
                recent_txs = self.transaction_monitor._get_recent_transactions(tx.wallet_address)
                await self.sar_system.generate_sar(alert, recent_txs, profile)
        
        return True, "Approved", alerts
    
    def get_compliance_report(self) -> Dict:
        """Generate compliance status report"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "audit_chain_length": len(self.audit_trail.chain),
            "pending_alerts": len([
                a for a in self.transaction_monitor.transaction_history
                if a.compliance_status == "FLAGGED"
            ]),
            "filed_sars": len(self.sar_system.filed_sars),
            "draft_sars": len(self.sar_system.draft_sars),
            "blocked_wallets": sum(
                1 for addr, screening in self.transaction_monitor.chainalysis.screening_cache.items()
                if screening.get("category") == "BLOCK"
            ),
            "user_profiles": len(self.user_profiles),
            "verified_users": sum(
                1 for p in self.user_profiles.values() if p.is_compliant
            )
        }


# Example usage
async def main():
    """Demo the compliance engine"""
    
    compliance = ComplianceManager()
    
    # Create test transaction
    tx = TransactionRecord(
        tx_hash="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        timestamp=datetime.utcnow(),
        wallet_address="0xabcd...1234",
        direction="OUT",
        token="WETH",
        amount_usd=50000,  # $50K - requires KYC
        from_address="0xabcd...1234",
        to_address="0x9876...abcd",
        gas_used=21000,
        gas_price_gwei=30,
        block_number=18000000,
        risk_score=0,
        compliance_status="PENDING"
    )
    
    # Process transaction
    approved, message, alerts = await compliance.process_transaction(tx)
    
    print(f"Transaction: {message}")
    print(f"Approved: {approved}")
    print(f"Alerts: {len(alerts)}")
    
    # Generate report
    report = compliance.get_compliance_report()
    print(f"\\nCompliance Report: {json.dumps(report, indent=2)}")
    
    # Verify audit trail
    valid, invalid = compliance.audit_trail.verify_integrity()
    print(f"Audit Trail Valid: {valid}")


if __name__ == "__main__":
    asyncio.run(main())
