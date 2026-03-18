describe('Dashboard WebSocket Integration', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Visit the app and stub the WebSocket constructor to capture the instance
    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win, 'WebSocket').callsFake((url) => {
          const ws = {
            url,
            readyState: 1, // OPEN
            onopen: null,
            onmessage: null,
            onclose: null,
            onerror: null,
            send: cy.stub().as('wsSend'),
            close: cy.stub().as('wsClose'),
            // Helper to trigger events from the test context
            _triggerMessage: (data: any) => {
              if (ws.onmessage) {
                const event = { data: JSON.stringify(data) } as MessageEvent;
                ws.onmessage(event);
              }
            },
            _triggerOpen: () => {
              if (ws.onopen) {
                ws.onopen({} as Event);
              }
            }
          };
          
          mockSocket = ws;
          
          // Simulate connection open shortly after creation
          setTimeout(() => {
            ws._triggerOpen();
          }, 50);

          return ws;
        });
      },
    });
  });

  it('should display profit drops in the Profit Feed when receiving WS messages', () => {
    // Ensure we are on the Live Feed tab
    cy.contains('button', 'Live Feed').click();

    // Wait for the system connection message
    cy.contains('[SYSTEM] Connected to Alpha-Orion Real-time Stream.', { timeout: 10000 }).should('be.visible');

    const profitPayload = {
      type: 'PROFIT_DROP',
      timestamp: new Date().toISOString(),
      payload: {
        pair: 'CYPRESS/TEST',
        profit: 123.45,
        strategy: 'Test Strategy',
        executionTimeMs: 10,
        txHash: '0x123'
      }
    };

    // Trigger the WebSocket message
    cy.then(() => {
      mockSocket._triggerMessage(profitPayload);
    });

    // Verify the UI updates with the new profit drop
    cy.get('main').within(() => {
      cy.contains('🚀 PROFIT DROPPED: +$123.45').should('be.visible');
      cy.contains('Pair: CYPRESS/TEST').should('be.visible');
    });
  });

  it('should update risk metrics in the Right Sidebar when receiving TELEMETRY messages', () => {
    const telemetryPayload = {
      type: 'TELEMETRY',
      timestamp: new Date().toISOString(),
      payload: {
        risk: {
          var99: 9999,
          sortino: 5.5,
          portfolioDelta: 0.05
        },
        infra: {
          latency: 1,
          activeShards: 8,
          kafkaStatus: 'Degraded'
        }
      }
    };

    // Trigger the WebSocket message
    cy.then(() => {
      mockSocket._triggerMessage(telemetryPayload);
    });

    // Verify Right Sidebar updates
    // Check Risk Metrics
    cy.contains('VaR (99%, 1d)').parent().contains('$9,999').should('be.visible');
    cy.contains('Sortino Ratio').parent().contains('5.50').should('be.visible');
    cy.contains('Portfolio Delta').parent().contains('+0.0500').should('be.visible');

    // Check Infrastructure Health
    cy.contains('Avg. Latency').parent().contains('1ms').should('be.visible');
    cy.contains('Event Stream').parent().contains('Degraded').should('be.visible');
  });
});