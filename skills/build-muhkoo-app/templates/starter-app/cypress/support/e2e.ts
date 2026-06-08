/**
 * Cypress support — loaded before every spec.
 *
 * Provides `cy.signUp()` (register a fresh user + land on the home screen) and
 * wipes session state between specs so they don't bleed into each other.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Register a brand-new user and wait until the home screen renders. */
      signUp(username?: string, password?: string): Chainable<string>;
    }
  }
}

const SLOW = 90_000; // ZK register + login = two in-browser proofs

Cypress.Commands.add("signUp", (username?: string, password = "cypress-pw-12345") => {
  // Unique username per call so re-runs never collide with prior registrations.
  const user = username ?? `cy_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  cy.visit("/");
  cy.get('[data-cy="auth-screen"]', { timeout: SLOW }).should("be.visible");
  cy.get('[data-cy="tab-register"]').click();
  cy.get('input[autocomplete="username"]').clear().type(user);
  cy.get('input[autocomplete="new-password"]').clear().type(password);
  cy.get('[data-cy="auth-submit"]').click();
  // register → login (two proofs) → home renders with the username.
  cy.get('[data-cy="home"]', { timeout: SLOW }).should("be.visible");
  cy.get('[data-cy="current-user"]', { timeout: SLOW }).should("contain", user);
  return cy.wrap(user);
});

beforeEach(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Benign ZK-loader races during early bootstrap shouldn't fail the run.
Cypress.on("uncaught:exception", (err) => {
  if (/(circomlibjs|snarkjs).*not (loaded|ready)/i.test(err.message)) return false;
  return true;
});

export {};
