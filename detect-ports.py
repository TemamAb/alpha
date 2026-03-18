#!/usr/bin/env python3
"""
Alpha-Orion Port Detection & Auto-Configuration Script
Strategically finds available ports and configures services for optimal deployment.
"""

import socket
import json
import os
from typing import List, Dict

def is_port_available(port: int) -> bool:
    """Check if a port is available on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(('localhost', port))
            return True
        except OSError:
            return False

def find_available_ports(start_port: int, count: int) -> List[int]:
    """Find 'count' consecutive available ports starting from start_port."""
    available_ports = []
    current_port = start_port

    while len(available_ports) < count:
        if is_port_available(current_port):
            available_ports.append(current_port)
        current_port += 1

    return available_ports

def generate_docker_compose_config(ports: Dict[str, int]) -> str:
    """Generate docker-compose.yml with detected ports."""
    config = f"""version: '3.8'

services:
  # Frontend - Auto-detected port: {ports['frontend']}
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "{ports['frontend']}:80"
    environment:
      - REACT_APP_API_URL=http://localhost:{ports['api']}
    depends_on:
      - user-api-service

  # Main API Gateway - Auto-detected port: {ports['api']}
  user-api-service:
    build:
      context: ./backend-services/services/user-api-service
      dockerfile: Dockerfile
    ports:
      - "{ports['api']}:8080"
    environment:
      - NODE_ENV=development
      - AI_OPTIMIZER_URL=http://ai-optimizer:8080
      - ORDER_MANAGEMENT_URL=http://order-management-service:8080
    depends_on:
      - ai-optimizer
      - order-management-service

  # AI Services
  ai-optimizer:
    build:
      context: ./backend-services/services/ai-optimizer
      dockerfile: Dockerfile
    ports:
      - "{ports['ai_optimizer']}:8080"
    environment:
      - PROJECT_ID=alpha-orion
      - DATABASE_URL=postgresql://user:password@db:5432/alpha_orion
      - REDIS_URL=redis://redis:6379

  ai-agent-service:
    build:
      context: ./backend-services/services/ai-agent-service
      dockerfile: Dockerfile
    ports:
      - "{ports['ai_agent']}:8080"
    environment:
      - PROJECT_ID=alpha-orion
      - DATABASE_URL=postgresql://user:password@db:5432/alpha_orion
      - REDIS_URL=redis://redis:6379

  # Core Services
  order-management-service:
    build:
      context: ./backend-services/services/order-management-service
      dockerfile: Dockerfile
    ports:
      - "{ports['order_management']}:8080"
    environment:
      - PROJECT_ID=alpha-orion
      - DATABASE_URL=postgresql://user:password@db:5432/alpha_orion
      - REDIS_URL=redis://redis:6379

  brain-orchestrator:
    build:
      context: ./backend-services/services/brain-orchestrator
      dockerfile: Dockerfile
    ports:
      - "{ports['brain_orchestrator']}:8080"
    environment:
      - PROJECT_ID=alpha-orion
      - DATABASE_URL=postgresql://user:password@db:5432/alpha_orion
      - REDIS_URL=redis://redis:6379

  eye-scanner:
    build:
      context: ./backend-services/services/eye-scanner
      dockerfile: Dockerfile
    ports:
      - "{ports['eye_scanner']}:8080"
    environment:
      - PROJECT_ID=alpha-orion
      - DATABASE_URL=postgresql://user:password@db:5432/alpha_orion
      - REDIS_URL=redis://redis:6379

  # Database
  db:
    image: postgres:13
    ports:
      - "{ports['postgres']}:5432"
    environment:
      - POSTGRES_DB=alpha_orion
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "{ports['redis']}:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
"""
    return config

def main():
    print("AI Alpha-Orion Port Detection Strategist")
    print("=" * 50)

    # Detect available ports
    print("Scanning for available ports...")
    ports = find_available_ports(3000, 9)  # Need 9 ports

    port_config = {
        'frontend': ports[0],
        'api': ports[1],
        'ai_optimizer': ports[2],
        'ai_agent': ports[3],
        'order_management': ports[4],
        'brain_orchestrator': ports[5],
        'eye_scanner': ports[6],
        'postgres': ports[7],
        'redis': ports[8]
    }

    print("Available ports detected:")
    for service, port in port_config.items():
        print(f"   {service}: {port}")

    # Generate docker-compose.yml
    print("\nGenerating optimized docker-compose.yml...")
    docker_compose_content = generate_docker_compose_config(port_config)

    with open('docker-compose.yml', 'w') as f:
        f.write(docker_compose_content)

    # Save port configuration for reference
    with open('ports.json', 'w') as f:
        json.dump(port_config, f, indent=2)

    print("Configuration saved to docker-compose.yml and ports.json")

    # Display access information
    print("\nDeployment Strategy:")
    print(f"   Frontend: http://localhost:{port_config['frontend']}")
    print(f"   API Gateway: http://localhost:{port_config['api']}")
    print(f"   Database: localhost:{port_config['postgres']}")
    print(f"   Cache: localhost:{port_config['redis']}")

    print("\nNext Steps:")
    print("   1. Run: docker-compose up -d")
    print("   2. Access frontend to start making profits!")
    print("   3. Monitor: docker-compose logs -f")
    print("   4. Scale: docker-compose up -d --scale ai-optimizer=3")

    return port_config

if __name__ == "__main__":
    ports = main()