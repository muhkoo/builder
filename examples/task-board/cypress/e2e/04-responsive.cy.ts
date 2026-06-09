/**
 * Responsive — the app must work on a phone. Loads at a 375×812 viewport and
 * asserts: no horizontal page overflow, and the core controls are visible and
 * usable at mobile width (auth, the app bar, both tabs, the add form).
 */
function expectNoHorizontalOverflow() {
  cy.window().then((win) => {
    const el = win.document.documentElement;
    // The page must not scroll horizontally (sub-panels may scroll internally).
    expect(el.scrollWidth, "no horizontal page overflow").to.be.at.most(el.clientWidth + 1);
  });
}

describe("responsive (mobile)", () => {
  beforeEach(() => cy.viewport(375, 812));

  it("auth screen fits a phone", () => {
    cy.visit("/");
    cy.get('[data-cy="auth-screen"]', { timeout: 90_000 }).should("be.visible");
    cy.get('[data-cy="auth-submit"]').should("be.visible");
    expectNoHorizontalOverflow();
  });

  it("the app is usable at mobile width", () => {
    cy.signUp();
    expectNoHorizontalOverflow();

    // App bar essentials are visible (a long username must not push the layout wide).
    cy.get('[data-cy="current-user"]').should("be.visible");
    cy.get('[data-cy="logout"]').should("be.visible");

    // Add a record at mobile width — the form must be reachable + usable.
    cy.get('[data-cy="records"]').should("be.visible");
    cy.get('[data-cy="record-input-title"]').type(`mobile ${Date.now()}`);
    cy.get('[data-cy="record-add"]').click();
    cy.get('[data-cy="record-row"]').should("have.length.greaterThan", 0);
    expectNoHorizontalOverflow();

    // The channel tab opens and fits, if the app has a channel.
    cy.get("body").then(($b) => {
      if ($b.find('[data-cy="tab-channel"]').length) {
        cy.get('[data-cy="tab-channel"]').click();
        cy.get('[data-cy="channel"]').should("be.visible");
        expectNoHorizontalOverflow();
      }
    });
  });
});
