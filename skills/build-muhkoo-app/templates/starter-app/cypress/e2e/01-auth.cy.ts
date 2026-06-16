/**
 * Auth — the app uses centralized hosted auth (auth.muhkoo.dev), so sign-in is a
 * cross-origin redirect. Cypress can't drive a third-party origin in the same
 * spec, so we verify the app-side entry: the "Continue with Muhkoo" button is
 * present and starts the redirect. Full sign-in/register/recovery is exercised
 * on the hosted page itself.
 *
 * Specs that need an authenticated app can inject a session programmatically
 * (set the persisted session token in localStorage in `onBeforeLoad`) rather
 * than walking the hosted UI.
 */
describe("auth", () => {
  it("shows the hosted sign-in entry", () => {
    cy.visit("/");
    cy.get('[data-cy="auth-screen"]').should("be.visible");
    cy.get('[data-cy="auth-submit"]').should("contain", "Continue with Muhkoo");
  });

  it("clicking Continue starts the redirect to the hosted auth page", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        // Stub the navigation so the assertion doesn't actually leave the app.
        cy.stub(win.location, "assign").as("assign");
      },
    });
    cy.get('[data-cy="auth-submit"]').click();
    // The SDK redirects to the hosted auth origin with an /authorize URL.
    cy.get("@assign").should("have.been.calledWithMatch", /\/authorize\?/);
  });
});
