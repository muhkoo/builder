/**
 * Realtime channel — connect to the E2E-encrypted channel and round-trip a
 * message (client.space). The sender sees its own message loop back through
 * fan-out. Skips itself if the app has no channel configured.
 */
describe("channel (realtime)", () => {
  it("connects and sends a message", () => {
    cy.signUp();

    // No Channel tab → app has CHANNEL = null; nothing to test.
    cy.get("body").then(($b) => {
      if ($b.find('[data-cy="tab-channel"]').length === 0) {
        cy.log("No channel configured — skipping.");
        return;
      }

      cy.get('[data-cy="tab-channel"]').click();
      cy.get('[data-cy="channel"]').should("be.visible");
      // Wait for the keyed WebSocket connection.
      cy.get('[data-cy="channel-status"]', { timeout: 60_000 }).should("contain", "connected");

      const msg = `cypress hello ${Date.now()}`;
      cy.get('[data-cy="chat-input"]').type(msg);
      cy.get('[data-cy="chat-send"]').click();
      cy.contains('[data-cy="chat-message"]', msg, { timeout: 30_000 }).should("be.visible");
    });
  });
});
