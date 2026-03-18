/**
 * Database Query Load Test
 * Tests the /api/history/trades endpoint with large dataset using k6
 * 
 * Usage: k6 run history-api-load-test.js
 * Or: k6 run --vus 500 --duration 60s history-api-load-test.js
 * 
 * Threshold: http_req_duration p(99) < 250ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// Configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Test scenarios
export const options = {
  scenarios: {
    // Ramp up from 0 to 100 users over 30 seconds
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
      ],
      gracefulRampDown: '10s',
    },
    // Stay at 100 users for 1 minute
    steady_state: {
      executor: 'constant-vus',
      vus: 100,
      duration: '60s',
      startTime: '40s', // Start after ramp up
    },
    // Spike to 500 users
    spike: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '30s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 100 },
      ],
      startTime: '2m', // Start after steady state
    },
  },
  thresholds: {
    // Fail if 99% of requests are slower than 250ms
    http_req_duration: ['p(99)<250'],
    // Fail if error rate is greater than 1%
    errors: ['rate<0.01'],
  },
};

// Request headers
const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

// Test data - random filter parameters
const chains = ['Polygon', 'Ethereum', 'BSC', ''];
const strategies = ['flash_loan', 'triangular', 'arbitrage', ''];
const statuses = ['success', 'failed', ''];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomFilters() {
  const params = new URLSearchParams();
  
  // Random page (1-10)
  params.set('page', Math.floor(Math.random() * 10) + 1);
  
  // Random limit (10, 20, 50)
  const limits = [10, 20, 50];
  params.set('limit', getRandomItem(limits));
  
  // Random filters (50% chance of each filter)
  if (Math.random() > 0.5) {
    params.set('chain', getRandomItem(chains));
  }
  if (Math.random() > 0.5) {
    params.set('strategy', getRandomItem(strategies));
  }
  if (Math.random() > 0.5) {
    params.set('status', getRandomItem(statuses));
  }
  
  return params.toString();
}

export default function () {
  // Generate random filters for each request
  const filters = generateRandomFilters();
  const url = `${BASE_URL}/api/history/trades?${filters}`;
  
  // Make request
  const res = http.get(url, { headers });
  
  // Track response time
  responseTime.add(res.timings.duration);
  
  // Check response
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => r.json('data') !== undefined,
    'has pagination': (r) => r.json('pagination') !== undefined,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  // Track errors
  errorRate.add(!success);
  
  // Small delay between requests
  sleep(0.1);
}

// Summary function to print results
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

// Simple text summary formatter
function textSummary(data, opts) {
  const indent = opts.indent || '';
  const enableColors = opts.enableColors || false;
  
  let output = '\n';
  output += `${indent}=== Load Test Summary ===\n\n`;
  
  // HTTP metrics
  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration;
    output += `${indent}Response Time:\n`;
    output += `${indent}  avg: ${duration.values.avg.toFixed(2)}ms\n`;
    output += `${indent}  p50: ${duration.values['p(50)'].toFixed(2)}ms\n`;
    output += `${indent}  p95: ${duration.values['p(95)'].toFixed(2)}ms\n`;
    output += `${indent}  p99: ${duration.values['p(99)'].toFixed(2)}ms\n`;
    output += `${indent}  max: ${duration.values.max.toFixed(2)}ms\n\n`;
  }
  
  // Request metrics
  if (data.metrics.http_reqs) {
    const reqs = data.metrics.http_reqs;
    output += `${indent}Requests:\n`;
    output += `${indent}  total: ${reqs.values.count}\n`;
    output += `${indent}  rate: ${reqs.values.rate.toFixed(2)}/s\n\n`;
  }
  
  // Error rate
  if (data.metrics.errors) {
    const errors = data.metrics.errors;
    output += `${indent}Errors:\n`;
    output += `${indent}  rate: ${(errors.values.rate * 100).toFixed(2)}%\n`;
    output += `${indent}  count: ${errors.values.count}\n\n`;
  }
  
  // Thresholds
  output += `${indent}Thresholds:\n`;
  const thresholds = data.state.thresholds;
  for (const [key, value] of Object.entries(thresholds)) {
    const status = value.ok ? '✓ PASS' : '✗ FAIL';
    output += `${indent}  ${key}: ${status}\n`;
  }
  
  return output;
}

// Alternative simpler export for use without handleSummary
export const summary = (data) => {
  return {
    'summary.json': JSON.stringify({
      http_req_duration: data.metrics.http_req_duration,
      http_reqs: data.metrics.http_reqs,
      errors: data.metrics.errors,
    }),
  };
};
