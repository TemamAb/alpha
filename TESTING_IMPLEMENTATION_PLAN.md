# Alpha-Orion: Comprehensive Testing Implementation Plan

**Objective**: To implement a multi-layered testing strategy that validates the security, reliability, and profitability of the Alpha-Orion system, ensuring it is 100% ready for production deployment.

---

## Layer 1: Unit & Component Testing

**Goal**: Verify individual functions and components in isolation.

### Tasks:
1.  **Backend (`user-api-service`)**:
    *   **File**: `user-api-service.test.js`
    *   **Action**: Write unit tests for the `/api/history/trades` endpoint logic.
    *   **Method**: Use Jest/Mocha to mock `pgPool.query`. Test various filter and pagination inputs, asserting the generated SQL is correct.

2.  **Blockchain Monitor (`blockchain-monitor`)**:
    *   **File**: `test_blockchain_monitor.py`
    *   **Action**: Write unit tests for the `handle_event` function.
    *   **Method**: Use `pytest` and `unittest.mock`. Create a sample `Swap` event dictionary and a mock Redis client. Assert that `lpush` and `publish` are called with the correctly formatted JSON.

3.  **Frontend (`TradeHistory.tsx`)**:
    *   **File**: `TradeHistory.test.tsx`
    *   **Action**: Write component tests for table rendering and state changes.
    *   **Method**: Use React Testing Library and Jest. Mock the `fetch` API.
        *   Test 1: Assert the correct number of rows are rendered based on mock data.
        *   Test 2: Simulate a filter change and assert that `fetch` is called with the new URL parameters.

---

## Layer 2: Integration Testing

**Goal**: Verify correct communication between microservices and external dependencies.

### Tasks:
1.  **Live Data Pipeline Integration Test**:
    *   **Environment**: `docker-compose.test.yml` to run `blockchain-monitor`, `redis`, and `user-api-service`.
    *   **Action**: Create a test script (`test_pipeline.js` using `ioredis` and `ws`).
    *   **Method**:
        1.  The script connects a WebSocket client to the `user-api-service`.
        2.  The script uses a Redis client to `PUBLISH` a test event to the `blockchain_stream` channel.
        3.  Assert that the WebSocket client receives the exact same event.

2.  **Historical Data API Integration Test**:
    *   **Environment**: `docker-compose.test.yml` to run `user-api-service` and `postgres`.
    *   **Action**: Create a test script (`test_history_api.js` using `axios` and `pg`).
    *   **Method**:
        1.  The script first connects to the test Postgres DB and seeds it with a known set of 20 trades.
        2.  The script then makes an HTTP GET request to `/api/history/trades?chain=Polygon`.
        3.  Assert that the API response body contains the correct subset of data and that the `pagination` object is accurate.

---

## Layer 3: End-to-End (E2E) Testing

**Goal**: Validate complete user and system workflows through the UI.

### Tasks:
1.  **Real-time Stream E2E Test**:
    *   **Framework**: Cypress.
    *   **File**: `cypress/e2e/stream.cy.ts`
    *   **Method**:
        1.  `cy.visit('/dashboard')` and navigate to the "Blockchain Stream" section.
        2.  Use `cy.task()` to execute a Node.js script that injects a new event into Redis.
        3.  `cy.get('table > tbody > tr').first().should('contain', 'New Test Event Details')`.

2.  **History Filtering E2E Test**:
    *   **Framework**: Cypress.
    *   **File**: `cypress/e2e/history.cy.ts`
    *   **Method**:
        1.  Use `cy.exec()` to run a DB seeding script before the test.
        2.  `cy.visit('/dashboard')` and navigate to "Trade History".
        3.  `cy.get('[name="status"]').select('failed')`.
        4.  `cy.get('table > tbody').find('tr').should('have.length', 5)` (assuming 5 failed trades were seeded).
        5.  `cy.get('.pagination-info').should('contain', 'Page 1 of 1')`.

---

## Layer 4: Performance & Load Testing

**Goal**: Ensure system stability and responsiveness under heavy load.

### Tasks:
1.  **WebSocket Load Test**:
    *   **Tool**: k6.
    *   **File**: `user-api-service/ws-load-test.js` (already created).
    *   **Action**: Execute the script with increased virtual users (`k6 run --vus 500 --duration 60s ...`).
    *   **Validation**: Monitor test output for threshold failures. Concurrently, use `docker stats` to watch for CPU/memory spikes in the `user-api-service` container.

2.  **Database Query Load Test**:
    *   **Tool**: k6.
    *   **File**: `history-api-load-test.js`.
    *   **Action**:
        1.  Create a script to populate the `trades` table with >1 million rows.
        2.  Write a k6 script that hits `/api/history/trades` with randomized filter and page parameters.
    *   **Validation**: Set a k6 threshold: `http_req_duration: ['p(99)<250']`. The test fails if 99% of requests are not faster than 250ms.

---

## Layer 5: Financial & Security Testing

**Goal**: Prevent capital loss by validating financial logic and security.

### Tasks:
1.  **Atomic Transaction Safety Test**:
    *   **Framework**: Hardhat or Foundry.
    *   **Environment**: Mainnet fork.
    *   **Action**: Write a test that simulates an arbitrage opportunity becoming unprofitable mid-execution.
    *   **Method**:
        1.  Find a valid arbitrage path.
        2.  Construct the transaction for the `brain-orchestrator`.
        3.  Before sending the transaction, execute a separate, large trade on the forked mainnet that spoils the arbitrage.
        4.  Now, execute the `brain-orchestrator`'s transaction.
    *   **Validation**: Assert that the transaction completes successfully but that the profit recorded is zero or negative (due to gas) and, most critically, that the flash loan was repaid in full. **Any other outcome is a critical failure.**

---