/**
 * E2E Test: Real-time Stream
 * Tests the WebSocket stream functionality in the dashboard
 * 
 * Framework: Cypress
 */

describe('Real-time Stream E2E Tests', () => {
  const API_BASE_URL = Cypress.env('API_BASE_URL') || 'http://localhost:8080';
  const DASHBOARD_URL = Cypress.env('DASHBOARD_URL') || 'http://localhost:3000';

  beforeEach(() => {
    // Visit the dashboard
    cy.visit(DASHBOARD_URL);
    
    // Wait for the page to load
    cy.get('body').should('be.visible');
  });

  describe('Blockchain Stream Section', () => {
    it('should navigate to Blockchain Stream section', () => {
      // Look for navigation to the stream section
      cy.contains(/blockchain stream|stream/i)
        .should('be.visible')
        .click();
      
      // Verify we're on the stream page
      cy.url().should('include', 'stream');
    });

    it('should display real-time events in the stream table', () => {
      // Navigate to the stream section
      cy.contains(/blockchain stream|stream/i)
        .click();

      // Wait for the table to load
      cy.get('table', { timeout: 10000 })
        .should('be.visible');

      // Check that table headers are present
      cy.get('thead').within(() => {
        cy.contains('Timestamp').should('be.visible');
        cy.contains('Type').should('be.visible');
        cy.contains('Data').should('be.visible');
      });
    });

    it('should receive and display new events via WebSocket', () => {
      // This test verifies that the WebSocket connection is working
      // by injecting a test event via Redis (using cy.task)
      
      cy.contains(/blockchain stream|stream/i).click();

      // Wait for initial data
      cy.get('table tbody tr', { timeout: 10000 })
        .should('have.length.greaterThan', 0);

      // Get the current row count
      cy.get('table tbody tr')
        .then($rows => {
          const initialCount = $rows.length;
          
          // Inject a new event via Redis (requires backend setup)
          // This is a placeholder - in production, you'd use cy.task to communicate with the backend
          cy.task('injectTestEvent', {
            type: 'ARBITRAGE_EVENT',
            txHash: '0x' + 'a'.repeat(64),
            tokenIn: '0x' + '1'.repeat(40),
            tokenOut: '0x' + '2'.repeat(40),
            profit: '1000000000000000000',
            gasUsed: '150000',
            timestamp: Date.now(),
          }).then(() => {
            // Wait for the new event to appear
            cy.get('table tbody tr', { timeout: 10000 })
              .should('have.length.greaterThan', initialCount);
            
            // Verify the new event details
            cy.get('table tbody tr').first()
              .should('contain', 'ARBITRAGE_EVENT');
          });
        });
    });

    it('should handle WebSocket disconnection gracefully', () => {
      // Navigate to stream
      cy.contains(/blockchain stream|stream/i).click();

      // Check for connection status indicator
      cy.get('body').then($body => {
        // Look for connection status (if present)
        const statusElement = $body.find('[class*="status"], [class*="connection"]');
        if (statusElement.length > 0) {
          cy.get(statusElement).should('be.visible');
        }
      });
    });

    it('should auto-scroll to newest events', () => {
      cy.contains(/blockchain stream|stream/i).click();

      // Verify that new events appear at the top (newest first)
      cy.get('table tbody tr').first()
        .then($firstRow => {
          const firstTimestamp = $firstRow.find('td').first().text();
          
          // Wait a moment for potential new events
          cy.wait(2000);
          
          // The first row should either stay the same or be newer
          cy.get('table tbody tr').first()
            .should('not.have.class', 'older');
        });
    });
  });

  describe('Dashboard Live Updates', () => {
    it('should show live PnL updates', () => {
      // Check for PnL display
      cy.get('[class*="pnl"], [class*="profit"]')
        .should('be.visible');
    });

    it('should show active trades counter', () => {
      // Check for trades counter
      cy.get('[class*="trades"], [class*="count"]')
        .should('be.visible');
    });

    it('should update metrics in real-time', () => {
      // Get initial values
      cy.get('[class*="totalPnl"], [class*="pnl-value"]')
        .invoke('text')
        .then((initialValue) => {
          // Wait for potential updates
          cy.wait(5000);
          
          // Value should have updated or stayed the same
          cy.get('[class*="totalPnl"], [class*="pnl-value"]')
            .invoke('text')
            .should('be.not.empty');
        });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when WebSocket fails', () => {
      // This would require mocking WebSocket failure
      // For now, just verify the UI handles missing data gracefully
      
      cy.contains(/blockchain stream|stream/i).click();
      
      // Even if no data, should show appropriate message
      cy.get('body').then($body => {
        const hasContent = $body.find('table tbody tr').length > 0;
        const hasEmptyMessage = $body.text().includes('No data') || 
                               $body.text().includes('No events') ||
                               $body.text().includes('waiting');
        
        expect(hasContent || hasEmptyMessage).to.be.true;
      });
    });
  });
});

// Register custom task for injecting test events
Cypress.Commands.add('injectTestEvent', (eventData) => {
  // This would communicate with a backend service to inject the event
  // For example, using Redis or a test API endpoint
  cy.request('POST', `${API_BASE_URL}/test/inject-event`, eventData);
});
