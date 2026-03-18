#!/usr/bin/env python3
import socket

ports_to_test = [8888, 9200, 9500, 7777, 9999, 10000, 5000, 3000]

print("Testing ports for availability...\n")

for port in ports_to_test:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('127.0.0.1', port))
        sock.close()
        print(f"✅ PORT {port} IS FREE - USING THIS PORT!")
        print(f"\n🎯 PROPOSED PORT: {port}")
        print(f"Dashboard URL: http://localhost:{port}")
        break
    except OSError as e:
        print(f"❌ Port {port}: occupied or unavailable")

