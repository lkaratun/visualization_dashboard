let scatterPlot;

describe("Scatter plot", () => {
  before(() => {
    cy.visit("http://localhost:1234");
    scatterPlot = cy.get("#scatterPlot");
  });
  it("Contains the correct title", () =>
    // cy      .get("#scatterPlot .plotLabel")
    scatterPlot
      .invoke("text")
      .should("match", /Viewer rating vs Movie budget/));
});
