import socket
import json

def find_free_port(start_port=9090, max_attempts=100, timeout=0.5):
    """Fast scanning with timeout to find a single free port."""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(timeout)
                s.bind(('', port))
                return port
        except (OSError, socket.timeout):
            continue
    return None

def reserve_ports(count=5, start_port=9090):
    """Find and reserve a specified number of free ports."""
    free_ports = []
    port = start_port
    while len(free_ports) < count and port < start_port + 500:
        found_port = find_free_port(start_port=port)
        if found_port:
            free_ports.append(found_port)
            port = found_port + 1
        else:
            port += 1 # Move to next port if find_free_port fails
    return free_ports

if __name__ == "__main__":
    print("🔍 Scanning for 5 free ports...")
    ports = reserve_ports(5)
    if len(ports) == 5:
        print(f"✅ Reserved 5 free ports: {ports}")
        with open('reserved_ports.json', 'w') as f:
            json.dump({'dashboard_port': ports[0], 'api_ports': ports[1:]}, f)
    else:
        print(f"❌ Could not reserve 5 free ports. Found: {ports}")