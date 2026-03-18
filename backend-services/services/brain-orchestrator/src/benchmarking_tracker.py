import time
import logging

# Configure logging
logger = logging.getLogger("ApexBenchmarker")

class ApexBenchmarker:
    """
    Tracks performance metrics against the Apex Matrix standards.
    Used by the Brain Orchestrator to ensure trade execution meets latency and safety targets.
    """
    def __init__(self):
        self.metrics = {}
        self.benchmarks = {
            "latency": {"target": 50, "unit": "ms"},
            "mev_protection": {"target": 1.0, "unit": "rate"},
            "liquidity_sources": {"target": 100, "unit": "count"}
        }

    def start_timer(self, metric_name):
        """Start a timer for a specific metric."""
        self.metrics[metric_name] = time.time()

    def stop_timer(self, metric_name):
        """Stop the timer and log the duration."""
        if metric_name in self.metrics:
            duration_ms = (time.time() - self.metrics[metric_name]) * 1000
            self.log_metric("SPEED", metric_name, duration_ms, "ms")
            del self.metrics[metric_name]
            return duration_ms
        return 0

    def log_metric(self, category, name, value, unit):
        """Log a benchmark metric."""
        logger.info(f"BENCHMARK [{category}] {name}: {value}{unit}")

    def check_benchmark(self, name, value):
        """Check if a value meets the benchmark target."""
        if name in self.benchmarks:
            target = self.benchmarks[name]["target"]
            # For latency, lower is better. For others, logic might differ.
            status = "PASS" if value <= target else "FAIL" 
            logger.info(f"BENCHMARK_CHECK {name}: {value} vs Target {target} -> {status}")
            return status == "PASS"
        return True