import time
import json
import logging
import threading
from typing import Dict, List, Optional
import prometheus_client as prom

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class ApexBenchmarker:
    """
    Tracks Alpha-Orion performance against the 'Apex Predator' composite benchmark.
    Integrated with Prometheus for real-time monitoring and production telemetry.
    Singleton pattern to avoid duplicate Prometheus metrics.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, enable_prometheus: bool = True):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True

        self.benchmarks = {
            "latency": {"leader": "Wintermute", "target": 50, "unit": "ms"},
            "mev_protection": {"leader": "Gnosis", "target": 100, "unit": "%"},
            "liquidity_depth": {"leader": "1inch", "target": 100, "unit": "sources"},
            "uptime": {"leader": "Google Cloud", "target": 99.99, "unit": "%"},
            "gas_efficiency": {"leader": "Pimlico", "target": 0, "unit": "gas"}
        }
        self.metrics = {
            "latency": [],
            "mev_protection": [],
            "liquidity_depth": [],
            "uptime": [],
            "gas_efficiency": []
        }

        # Prometheus metrics
        if enable_prometheus:
            self._setup_prometheus_metrics()

        # Continuous monitoring thread
        self.monitoring_active = False
        self.monitor_thread = None

    def _setup_prometheus_metrics(self):
        """Initialize Prometheus metrics for real-time monitoring."""
        self.prom_latency = prom.Histogram(
            'alpha_orion_latency_ms',
            'Tick-to-trade latency in milliseconds',
            buckets=[10, 25, 50, 75, 100, 150, 200]
        )
        self.prom_mev_protection = prom.Gauge(
            'alpha_orion_mev_protection_rate',
            'MEV protection success rate (0-1)'
        )
        self.prom_liquidity_sources = prom.Gauge(
            'alpha_orion_liquidity_sources',
            'Number of integrated liquidity sources'
        )
        self.prom_benchmark_status = prom.Gauge(
            'alpha_orion_benchmark_status',
            'Benchmark compliance status (1=pass, 0=fail)',
            ['benchmark_type']
        )
        self.prom_uptime = prom.Gauge(
            'alpha_orion_uptime_percent',
            'System uptime percentage'
        )
        self.prom_gas_efficiency = prom.Gauge(
            'alpha_orion_gas_efficiency',
            'Gas efficiency score (lower is better)'
        )

    def record_metric(self, metric_name, value):
        if metric_name in self.metrics:
            self.metrics[metric_name].append(value)
            self.evaluate(metric_name, value)
            self._update_prometheus(metric_name, value)
        else:
            logging.warning(f"Unknown metric: {metric_name}")

    def _update_prometheus(self, metric_name, value):
        """Update Prometheus metrics with new values."""
        if not hasattr(self, 'prom_latency'):
            return

        if metric_name == "latency":
            self.prom_latency.observe(value)
        elif metric_name == "mev_protection":
            self.prom_mev_protection.set(value / 100.0)  # Convert to 0-1
        elif metric_name == "liquidity_depth":
            self.prom_liquidity_sources.set(value)
        elif metric_name == "uptime":
            self.prom_uptime.set(value)
        elif metric_name == "gas_efficiency":
            self.prom_gas_efficiency.set(value)

        # Update benchmark status
        benchmark = self.benchmarks[metric_name]
        target = benchmark["target"]
        passed = value <= target if metric_name == "latency" else value >= target
        self.prom_benchmark_status.labels(benchmark_type=metric_name).set(1 if passed else 0)

    def evaluate(self, metric_name, value):
        benchmark = self.benchmarks[metric_name]
        target = benchmark["target"]
        leader = benchmark["leader"]

        passed = False
        if metric_name == "latency":
            passed = value <= target
        else:
            passed = value >= target

        status = "✅ PASS" if passed else "❌ FAIL"
        logging.info(f"[{status}] {metric_name.upper()} vs {leader}: {value}{benchmark['unit']} (Target: {target}{benchmark['unit']})")

        # Alert on benchmark failure
        if not passed:
            self._alert_benchmark_failure(metric_name, value, target, leader)

    def _alert_benchmark_failure(self, metric_name, value, target, leader):
        """Send alerts when benchmarks are missed."""
        logging.error(f"🚨 BENCHMARK BREACH: {metric_name.upper()} failed against {leader}")
        logging.error(f"   Current: {value}, Target: {target}")
        # In production, this would integrate with PagerDuty/Slack

    def start_continuous_monitoring(self, interval_seconds: int = 60):
        """Start background thread for continuous benchmark monitoring."""
        if self.monitoring_active:
            return

        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._continuous_monitor_loop, args=(interval_seconds,))
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        logging.info("Continuous benchmark monitoring started")

    def stop_continuous_monitoring(self):
        """Stop the continuous monitoring thread."""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join()
        logging.info("Continuous benchmark monitoring stopped")

    def _continuous_monitor_loop(self, interval_seconds: int):
        """Background loop for continuous monitoring."""
        while self.monitoring_active:
            try:
                self._perform_health_checks()
                time.sleep(interval_seconds)
            except Exception as e:
                logging.error(f"Error in continuous monitoring: {e}")

    def _perform_health_checks(self):
        """Perform automated health checks and update metrics."""
        # This would integrate with actual system health checks
        # For now, simulate uptime tracking
        self.record_metric("uptime", 99.95)  # Simulated uptime

    def generate_report(self):
        report = {}
        for name, values in self.metrics.items():
            if not values:
                continue
            
            avg_val = sum(values) / len(values)
            benchmark = self.benchmarks[name]
            
            report[name] = {
                "leader": benchmark["leader"],
                "target": benchmark["target"],
                "alpha_orion_avg": round(avg_val, 2),
                "status": "PASS" if (avg_val <= benchmark["target"] if name == "latency" else avg_val >= benchmark["target"]) else "FAIL"
            }
        
        return json.dumps(report, indent=2)

# Example Usage Simulation
if __name__ == "__main__":
    tracker = ApexBenchmarker()
    tracker.record_metric("latency", 42)  # Beating Wintermute
    tracker.record_metric("latency", 55)  # Failing
    tracker.record_metric("liquidity_depth", 105) # Beating 1inch
    print("\n--- APEX REPORT ---\n" + tracker.generate_report())