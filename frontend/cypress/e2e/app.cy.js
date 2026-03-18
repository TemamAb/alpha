describe('Alpha-Orion Dashboard E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the dashboard', () => {
    cy.contains('Alpha-Orion').should('be.visible');
  });

  it('should navigate to Analytics page', () => {
    cy.get('[data-cy=analytics-link]').click();
    cy.url().should('include', '/analytics');
    cy.contains('Analytics').should('be.visible');
  });

  it('should navigate to Opportunities page', () => {
    cy.get('[data-cy=opportunities-link]').click();
    cy.url().should('include', '/opportunities');
    cy.contains('Opportunities').should('be.visible');
  });

  // Add more e2e tests as needed
});