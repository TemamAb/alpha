import socket
import threading
import logging
import sys
import signal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

HOST = '0.0.0.0'
PORT = 8080

def handle_client(conn, addr):
    """
    Handles a single client connection.
    Echoes back any data received.
    """
    try:
        # Disable Nagle's algorithm for lower latency on small packets
        conn.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        
        while True:
            data = conn.recv(1024)
            if not data:
                break
            conn.sendall(data)
    except ConnectionResetError:
        pass # Client disconnected abruptly
    except Exception as e:
        logging.error(f"Error handling client {addr}: {e}")
    finally:
        conn.close()

def start_server():
    """
    Starts the TCP Echo Server.
    """
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server_socket.bind((HOST, PORT))
        server_socket.listen(1000) # High backlog for benchmarking
        logging.info(f"Echo Server listening on {HOST}:{PORT}")
        
        while True:
            try:
                conn, addr = server_socket.accept()
                # Use threading to handle concurrent connections
                client_thread = threading.Thread(target=handle_client, args=(conn, addr))
                client_thread.daemon = True
                client_thread.start()
            except OSError:
                break
                
    except Exception as e:
        logging.error(f"Server startup failed: {e}")
    finally:
        if server_socket:
            server_socket.close()
            logging.info("Server socket closed")

def signal_handler(sig, frame):
    logging.info("Shutting down Echo Server...")
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    start_server()