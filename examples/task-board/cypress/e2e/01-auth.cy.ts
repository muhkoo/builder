/**
 * Auth — ZK register + session persistence against the live backend.
 */
const SLOW = 90_000;

describe("auth", () => {
  it("registers a new user and lands on the home screen", () => {
    cy.signUp().then((user) => {
      cy.get('[data-cy="current-user"]').should("contain", user);
      // A session token is persisted (covers the restore-on-reload path).
      cy.window().then((win) => {
        const keys = Object.keys(win.localStorage);
        expect(keys.some((k) => /session|token|muhkoo/i.test(k)), "a session key in localStorage").to.eq(true);
      });
    });
  });

  it("keeps the user signed in across a reload", () => {
    cy.signUp();
    cy.reload();
    cy.get('[data-cy="home"]', { timeout: SLOW }).should("be.visible");
  });
});
