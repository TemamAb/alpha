import http.server
import socketserver
import json
import os

def serve_on_free_port():
    """Serves the App.html on a port from reserved_ports.json."""
    try:
        with open('reserved_ports.json', 'r') as f:
            ports_data = json.load(f)
            port = ports_data.get('dashboard_port')
            if not port:
                print("❌ 'dashboard_port' not found in reserved_ports.json. Using default 9090.")
                port = 9090
    except FileNotFoundError:
        print("⚠️ reserved_ports.json not found. Using default port 9090.")
        port = 9090

    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"✅ Serving App.html at http://localhost:{port}")
        httpd.serve_forever()

if __name__ == "__main__":
    serve_on_free_port()