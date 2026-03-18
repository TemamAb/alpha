#!/usr/bin/env python3
"""
Simple HTTP Server to serve the Alpha-Orion Dashboard
Serves the extracted dashboard on localhost with auto-detected port.
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

def find_available_port(start_port=8000):
    """Find an available port starting from start_port."""
    port = start_port
    while True:
        try:
            with socketserver.TCPServer(("", port), None) as httpd:
                return port
        except OSError:
            port += 1

def main():
    # Check if dashboard exists
    dashboard_path = Path("frontend/extracted-dashboard")
    if not dashboard_path.exists():
        print("❌ Dashboard not found! Run extraction first.")
        return

    # Find available port
    port = find_available_port(8000)
    dashboard_url = f"http://localhost:{port}"

    print("Alpha-Orion Professional Dashboard Server")
    print("=" * 50)
    print(f"Serving from: {dashboard_path.absolute()}")
    print(f"Dashboard URL: {dashboard_url}")
    print("Connected to AI Backend: http://localhost:3001")
    print("\nFeatures:")
    print("   - Real-time AI optimization")
    print("   - Live profit calculations")
    print("   - Service monitoring dashboard")
    print("   - Trading opportunities feed")
    print("   - Strategy performance analytics")
    print("\nQuick Actions:")
    print("   - Refresh for new AI calculations")
    print("   - Monitor real-time profits")
    print("   - View service health status")

    # Change to dashboard directory
    os.chdir(dashboard_path)

    # Create handler for SPA (serve index.html for all routes)
    class SPAHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith('/api'):
                # Proxy API calls to backend
                self.send_response(302)
                self.send_header('Location', f'http://localhost:3001{self.path}')
                self.end_headers()
                return

            # Serve index.html for all other routes (SPA routing)
            if not self.path.endswith(('.js', '.css', '.png', '.jpg', '.svg', '.ico', '.json')):
                self.path = '/index.html'

            return super().do_GET()

    # Start server
    try:
        with socketserver.TCPServer(("", port), SPAHandler) as httpd:
            print(f"\nServer started successfully!")
            print(f"Open your browser to: {dashboard_url}")
            print("\nPress Ctrl+C to stop the server")

            # Auto-open browser
            try:
                webbrowser.open(dashboard_url)
            except:
                pass  # Browser open failed, but server still works

            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\nServer stopped. Your AI trading dashboard session has ended.")

if __name__ == "__main__":
    main()