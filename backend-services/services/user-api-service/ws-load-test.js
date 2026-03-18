import ws from 'k6/ws';
import { check } from 'k6';

/**
 * k6 Load Test for the Alpha-Orion WebSocket Server
 * 
 * This script simulates multiple clients connecting to the WebSocket endpoint
 * to measure its performance and stability under load.
 * 
 * How to run:
 * 1. Make sure the user-api-service is running locally.
 * 2. Install k6: https://k6.io/docs/getting-started/installation/
 * 3. Run from the command line in this directory:
 *    k6 run ws-load-test.js
 */

export const options = {
  stages: [
    { duration: '15s', target: 100 }, // Ramp-up: 0 to 100 users over 15 seconds
    { duration: '30s', target: 100 }, // Hold: Stay at 100 users for 30 seconds
    { duration: '10s', target: 0 },   // Ramp-down: 100 to 0 users over 10 seconds
  ],
  thresholds: {
    // 95% of WebSocket connections should be established in under 100ms.
    'ws_connecting': ['p(95)<100'],
    // Ensure we have active sessions during the test.
    'ws_sessions': ['count>90'],
  },
};

export default function () {
  const url = 'ws://localhost:8080'; // The local URL of our WebSocket server

  const res = ws.connect(url, null, function (socket) {
    socket.on('open', () => {
      // This is a good place to log for debugging, but can be noisy during a real test.
      // console.log('WebSocket connection established!');
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      // Check if the initial connection message is received correctly.
      check(message, {
        'is a welcome message': (m) => m.type === 'connection' && m.message.includes('Welcome'),
      });
    });

    socket.on('close', () => {
      // console.log('WebSocket connection closed.');
    });

    socket.setTimeout(() => socket.close(), 10000); // Keep the connection open for 10 seconds.
  });

  // Verify that the HTTP upgrade to WebSocket was successful.
  check(res, { 'status is 101 (Switching Protocols)': (r) => r && r.status === 101 });
}