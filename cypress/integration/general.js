describe("Visualization in general", () => {
  before(() => {
    cy.visit("http://localhost:1234");
  });
  it("Contains the correct title", () => {
    cy.contains("Movie data visualization");
  });
  it("Should contain 3 svg elements", () => {
    cy.get("svg").should(svgs => expect(svgs).to.have.length(3));
  });
  it("Should contain a slider", () => {
    cy.get("#scale-slider").should("be.visible");
  });
});
