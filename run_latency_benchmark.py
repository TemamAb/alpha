import time
import socket
import argparse
import statistics
import json
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

def measure_tcp_latency(host, port, timeout=2.0):
    """
    Measures the round-trip time for a TCP connection and simple handshake.
    This simulates the network overhead of establishing a connection for execution
    in a high-frequency trading environment.
    """
    start_time = time.perf_counter()
    try:
        # Create a socket object
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        
        # Connect to the server (Simulates opening a trade channel)
        s.connect((host, port))
        
        # Optional: Send a ping payload if an echo server is running
        # s.sendall(b'PING')
        # s.recv(1024)
        
        s.close()
        end_time = time.perf_counter()
        
        # Return latency in milliseconds
        return (end_time - start_time) * 1000
    except Exception as e:
        logging.error(f"Connection failed: {e}")
        return None

def run_benchmark(host, port, count, rate):
    """
    Executes the benchmark loop maintaining the specified request rate.
    """
    delay = 1.0 / rate
    logging.info(f"Starting latency benchmark against {host}:{port}")
    logging.info(f"Target: {count} requests @ {rate} req/s")
    
    latencies = []
    start_benchmark = time.perf_counter()
    
    for i in range(count):
        iter_start = time.perf_counter()
        
        latency = measure_tcp_latency(host, port)
        if latency is not None:
            latencies.append(latency)
        
        # Precise timing to maintain frequency
        elapsed = time.perf_counter() - iter_start
        sleep_time = delay - elapsed
        if sleep_time > 0:
            time.sleep(sleep_time)
            
    total_time = time.perf_counter() - start_benchmark
    logging.info(f"Benchmark finished in {total_time:.2f}s. Successful samples: {len(latencies)}/{count}")
    return latencies

def generate_report(latencies, target_ms=50):
    """
    Generates a JSON report with statistical analysis of the latency data.
    """
    if not latencies:
        return json.dumps({"error": "No successful measurements"}, indent=2)
        
    avg_latency = statistics.mean(latencies)
    min_latency = min(latencies)
    max_latency = max(latencies)
    p50 = statistics.median(latencies)
    # Calculate percentiles (requires Python 3.8+)
    p95 = statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max_latency
    p99 = statistics.quantiles(latencies, n=100)[98] if len(latencies) >= 100 else max_latency
    
    status = "PASS" if p99 <= target_ms else "FAIL"
    
    report = {
        "benchmark_type": "TCP_RoundTrip_Latency",
        "samples": len(latencies),
        "metrics": {
            "min_ms": round(min_latency, 3),
            "max_ms": round(max_latency, 3),
            "avg_ms": round(avg_latency, 3),
            "p50_ms": round(p50, 3),
            "p95_ms": round(p95, 3),
            "p99_ms": round(p99, 3)
        },
        "target_ms": target_ms,
        "status": status,
        "timestamp": time.time()
    }
    
    return json.dumps(report, indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Alpha-Orion Latency Benchmark Tool')
    parser.add_argument('--host', type=str, required=True, help='Target Host IP (Benchmarking Node)')
    parser.add_argument('--port', type=int, default=22, help='Target Port (default: 22 for SSH reachability test)')
    parser.add_argument('--count', type=int, default=100, help='Number of requests to send')
    parser.add_argument('--rate', type=float, default=10.0, help='Requests per second (Hz)')
    parser.add_argument('--target', type=float, default=50.0, help='Target latency in ms (default: 50ms)')
    
    args = parser.parse_args()
    
    results = run_benchmark(args.host, args.port, args.count, args.rate)
    report = generate_report(results, args.target)
    
    print("\n--- BENCHMARK REPORT ---")
    print(report)
    
    # Exit with status code based on pass/fail for CI/CD integration
    report_json = json.loads(report)
    if report_json.get("status") == "FAIL":
        sys.exit(1)
    else:
        # Exit cleanly
        sys.exit(0)