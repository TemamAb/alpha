describe('Strategy Matrix CRUD Operations', () => {
  beforeEach(() => {
    // Mock the save configuration API call to avoid actual network requests during the test
    cy.intercept('POST', '**/api/v1/matrix/configuration', {
      statusCode: 200,
      body: { status: 'success', message: 'Matrix configuration persisted.' },
    }).as('saveConfiguration');

    cy.visit('/');
    cy.contains('button', 'Matrix').click();
  });

  it('should add a new entry to the Arbitrage Strategies Matrix', () => {
    const newStrategyName = 'Cyclic Arbitrage (Test)';
    const newStrategyPattern = 'A-B-C-A';

    // 1. Find the "Arbitrage Strategies Matrix" table and click its "Add" button
    cy.contains('h3', 'Arbitrage Strategies Matrix')
      .closest('.bg-gray-800\\/50')
      .find('button[class*="hover:text-green-400"]')
      .click();

    // 2. Verify the modal opens for adding a new entry
    cy.contains('h3', 'Add New Entry').should('be.visible');

    // 3. Fill out the form
    cy.contains('label', 'Name').siblings('input').type(newStrategyName);
    cy.contains('label', 'Pattern / Strategy').siblings('input').type(newStrategyPattern);

    // 4. Save the new entry
    cy.contains('button', 'Save Changes').click();

    // 5. Verify the modal is closed and the new entry appears in the table
    cy.contains('h3', 'Add New Entry').should('not.exist');
    cy.contains('h3', 'Arbitrage Strategies Matrix')
      .closest('.bg-black\\/40')
      .find('tbody')
      .should('contain', newStrategyName)
      .and('contain', newStrategyPattern);
  });

  it('should edit an existing entry in the Arbitrage Strategies Matrix', () => {
    const updatedStrategyName = 'Spot Arbitrage (Updated)';
    const updatedStrategyPattern = 'Triangular (Optimized)';

    // 1. Find the first row in the "Arbitrage Strategies Matrix" table
    cy.contains('h3', 'Arbitrage Strategies Matrix')
      .closest('.bg-black\\/40')
      .find('tbody tr')
      .first()
      .as('firstRow');

    // 2. Click the "Edit" button on that row. It's invisible until hover, so force the click.
    cy.get('@firstRow').find('button[class*="text-blue-400"]').click({ force: true });

    // 3. Verify the modal opens for editing
    cy.contains('h3', 'Edit Configuration').should('be.visible');

    // 4. Clear existing values and type new ones
    cy.contains('label', 'Name').siblings('input').clear().type(updatedStrategyName);
    cy.contains('label', 'Pattern / Strategy').siblings('input').clear().type(updatedStrategyPattern);

    // 5. Save the changes
    cy.contains('button', 'Save Changes').click();

    // 6. Verify the modal is closed and the entry is updated in the table
    cy.contains('h3', 'Edit Configuration').should('not.exist');
    cy.get('@firstRow').should('contain', updatedStrategyName).and('contain', updatedStrategyPattern);
  });
});