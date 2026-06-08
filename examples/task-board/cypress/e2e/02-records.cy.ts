/**
 * Database CRUD — add / toggle / delete a record against the live `tasks`
 * table (client.db). The data plane is keyed by the app, so rows are shared;
 * the test uses a unique title and only asserts on its own row.
 */
describe("records (database)", () => {
  it("adds, toggles, and deletes a record", () => {
    cy.signUp();

    const title = `cypress task ${Date.now()}`;

    // The default tab is Records.
    cy.get('[data-cy="records"]').should("be.visible");

    // Add
    cy.get('[data-cy="record-input-title"]').type(title);
    cy.get('[data-cy="record-add"]').click();
    cy.contains('[data-cy="record-row"]', title, { timeout: 20_000 }).as("row");

    // Toggle the boolean (persists via client.db.update)
    cy.get("@row").find('[data-cy="record-toggle"]').click();
    cy.get("@row").find('input[type="checkbox"]').should("be.checked");

    // Delete (client.db.delete) — the row disappears
    cy.get("@row").find('[data-cy="record-delete"]').click();
    cy.contains('[data-cy="record-row"]', title).should("not.exist");
  });
});
