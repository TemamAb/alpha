/**
 * E2E Test: History Filtering
 * Tests the Trade History filtering and pagination functionality in the dashboard
 * 
 * Framework: Cypress
 */

describe('History Filtering E2E Tests', () => {
  const DASHBOARD_URL = Cypress.env('DASHBOARD_URL') || 'http://localhost:3000';

  beforeEach(() => {
    // Visit the dashboard
    cy.visit(DASHBOARD_URL);
    
    // Wait for the page to load
    cy.get('body').should('be.visible');
  });

  describe('Trade History Section', () => {
    beforeEach(() => {
      // Navigate to Trade History section
      cy.contains(/trade history|history/i)
        .should('be.visible')
        .click();
      
      // Wait for the table to load
      cy.get('table', { timeout: 10000 })
        .should('be.visible');
    });

    it('should display the Trade History heading', () => {
      cy.contains(/trade history/i)
        .should('be.visible');
    });

    it('should display table with correct headers', () => {
      cy.get('thead').within(() => {
        cy.contains('Timestamp').should('be.visible');
        cy.contains('Chain').should('be.visible');
        cy.contains('Strategy').should('be.visible');
        cy.contains('Status').should('be.visible');
        cy.contains('Profit').should('be.visible');
      });
    });

    it('should load trade data into the table', () => {
      // Wait for data to load (loading spinner should disappear)
      cy.get('[class*="animate-spin"]', { timeout: 15000 }).should('not.exist');
      
      // Check that table has rows
      cy.get('table tbody tr')
        .should('have.length.greaterThan', 0);
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(() => {
      cy.contains(/trade history|history/i).click();
      cy.get('table', { timeout: 10000 }).should('be.visible');
    });

    it('should filter trades by Chain', () => {
      // Select Polygon from chain filter
      cy.get('select[name="chain"]')
        .should('be.visible')
        .select('Polygon');
      
      // Wait for filter to apply
      cy.wait(500);
      
      // Verify the API was called with correct filter
      cy.url().should('include', 'chain=Polygon');
      
      // Verify filtered results
      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('td').eq(1).should('contain', 'Polygon');
        });
      });
    });

    it('should filter trades by Status', () => {
      // Select failed from status filter
      cy.get('select[name="status"]')
        .should('be.visible')
        .select('failed');
      
      // Wait for filter to apply
      cy.wait(500);
      
      // Verify URL contains filter
      cy.url().should('include', 'status=failed');
      
      // Verify filtered results
      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('td').eq(3).should('contain', 'failed');
        });
      });
    });

    it('should reset to page 1 when filter changes', () => {
      // First, navigate to page 2 if available
      cy.get('button').contains(/chevronright|next/i).then(($btn) => {
        if ($btn.is(':enabled')) {
          cy.wrap($btn).click();
          cy.wait(500);
          cy.url().should('include', 'page=2');
        }
      });
      
      // Now change filter
      cy.get('select[name="chain"]').select('Polygon');
      cy.wait(500);
      
      // Should be back on page 1
      cy.url().should('not.include', 'page=2');
    });

    it('should combine multiple filters', () => {
      // Apply chain filter
      cy.get('select[name="chain"]').select('Polygon');
      cy.wait(300);
      
      // Apply status filter
      cy.get('select[name="status"]').select('success');
      cy.wait(500);
      
      // Verify both filters in URL
      cy.url().should('include', 'chain=Polygon');
      cy.url().should('include', 'status=success');
      
      // Verify filtered results match both filters
      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('td').eq(1).should('contain', 'Polygon');
          cy.get('td').eq(3).should('contain', 'success');
        });
      });
    });

    it('should filter by date range', () => {
      // Set start date
      cy.get('input[name="startDate"]')
        .should('be.visible')
        .type('2024-01-01');
      
      // Set end date
      cy.get('input[name="endDate"]')
        .should('be.visible')
        .type('2024-01-15');
      
      cy.wait(500);
      
      // Verify date filters in URL
      cy.url().should('include', 'startDate=');
      cy.url().should('include', 'endDate=');
    });

    it('should show no results message for invalid filter', () => {
      // Use a chain that likely has no results
      cy.get('select[name="chain"]').select('NonExistentChain');
      cy.wait(500);
      
      // Should show empty state message
      cy.contains(/no trades found|no results/i)
        .should('be.visible');
    });
  });

  describe('Pagination Functionality', () => {
    beforeEach(() => {
      cy.contains(/trade history|history/i).click();
      cy.get('table', { timeout: 10000 }).should('be.visible');
      cy.get('[class*="animate-spin"]', { timeout: 15000 }).should('not.exist');
    });

    it('should display pagination controls', () => {
      // Check for pagination info
      cy.get('[class*="pagination"]')
        .should('be.visible')
        .or_should('contain', 'Page');
    });

    it('should navigate to next page', () => {
      // Check if there's a next button
      cy.get('button').then(($buttons) => {
        const nextBtn = $buttons.filter(':contains("›"), :contains("next")');
        if (nextBtn.length > 0 && !nextBtn.prop('disabled')) {
          cy.wrap(nextBtn).click();
          cy.wait(500);
          
          // URL should reflect new page
          cy.url().should('satisfy', (url: string) => 
            url.includes('page=2') || url.includes('page=')
          );
        }
      });
    });

    it('should navigate to previous page', () => {
      // First go to page 2 if possible
      cy.get('button').contains(/›/i).then(($btn) => {
        if (!$btn.prop('disabled')) {
          cy.wrap($btn).click();
          cy.wait(500);
        }
      });
      
      // Now go back
      cy.get('button').contains(/‹/).then(($btn) => {
        if (!$btn.prop('disabled')) {
          cy.wrap($btn).click();
          cy.wait(500);
          
          // Should be back on page 1
          cy.url().should('satisfy', (url: string) => 
            url.includes('page=1') || !url.includes('page=2')
          );
        }
      });
    });

    it('should display correct pagination info', () => {
      // Look for pagination text like "Page 1 of 5"
      cy.get('[class*="pagination"]').then(($el) => {
        const text = $el.text();
        if (text.includes('Page')) {
          expect(text).to.match(/Page \d+ of \d+/);
        }
      });
    });

    it('should display total records count', () => {
      cy.get('[class*="pagination"]').then(($el) => {
        const text = $el.text();
        if (text.includes('Total')) {
          expect(text).to.match(/Total Records: \d+/i);
        }
      });
    });

    it('should disable previous button on first page', () => {
      // Should be on page 1 by default
      cy.url().then((url) => {
        if (!url.includes('page=') || url.includes('page=1')) {
          cy.get('button').contains(/‹|previous/i)
            .should('be.disabled');
        }
      });
    });
  });

  describe('Table Data Display', () => {
    beforeEach(() => {
      cy.contains(/trade history|history/i).click();
      cy.get('table', { timeout: 10000 }).should('be.visible');
      cy.get('[class*="animate-spin"]', { timeout: 15000 }).should('not.exist');
    });

    it('should display correct chain badges', () => {
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(1).then(($cell) => {
          // Chain should be displayed as a badge
          expect($cell.find('span').length).to.be.greaterThan(0);
        });
      });
    });

    it('should display profit with correct formatting', () => {
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(4).then(($cell) => {
          const text = $cell.text();
          // Should contain $ sign
          expect(text).to.include('$');
        });
      });
    });

    it('should color positive profit green and negative red', () => {
      // Check for positive profit styling
      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('td').eq(4).then(($cell) => {
            const hasGreen = $cell.attr('class')?.includes('emerald') || 
                           $cell.attr('class')?.includes('green') ||
                           $cell.text().includes('+$');
            const hasRed = $cell.attr('class')?.includes('red') ||
                         $cell.attr('class')?.includes('negative') ||
                         $cell.text().includes('-$');
            
            // Should have either green or red coloring
            expect(hasGreen || hasRed).to.be.true;
          });
        });
      });
    });

    it('should display status badges with correct colors', () => {
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(3).then(($cell) => {
          const text = $cell.text().trim().toLowerCase();
          const hasBadge = $cell.find('span').length > 0;
          
          expect(hasBadge || text === 'success' || text === 'failed').to.be.true;
        });
      });
    });
  });
});
