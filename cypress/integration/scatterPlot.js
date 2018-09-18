// import * as app from "../../app";

let displayMovieInfoSpy;

const testApp = {
  outer() {
    return setTimeout(this.inner, 1000);
  },
  inner: () => {
    console.log("Inner called");
  }
};
describe("TestApp", () => {
  it("should spy on the inner function", async () => {
    const innerSpy = cy.spy(testApp, "inner");
    // testApp.inner();
    testApp.outer().then(() => expect(innerSpy).not.to.be.called);
    // expect(innerSpy).to.be.called;
    // expect(innerSpy).to.be.called;
  });
});

describe("Scatter plot", () => {
  before(() => {
    cy.visit("http://localhost:1234", {
      onBeforeLoad() {
        // console.log(app.displayMovieInfo);
        // displayMovieInfoSpy = cy.spy(app, "displayMovieInfo");
        // console.log(app.displayMovieInfo);
      }
    });
  });
  it("Contains the correct title", () =>
    cy
      .get("#scatterPlot")
      .get(".plotLabel")
      .invoke("text")
      .should("match", /Viewer rating vs Movie budget/));
  it("Contains the correct subtitle", () => {
    cy.get("#scatterPlot")
      .get("text")
      .invoke("text")
      .should("match", /click a circle to see detailed movie info/);
  });
  it("Renders at least 1 circle", () => {
    cy.get("#scatterPlot circle")
      .its("length")
      .should("be.gt", 0);
  });
  it("Renders at least 20 circles", () => {
    cy.get("#scatterPlot circle")
      .its("length")
      .should("be.gte", 20);
  });
  it("Displays movie info on circle click", () => {
    cy.get("#scatterPlot")
      .get("circle")
      .eq(2)
      .click({ force: true })
      .as("clicking");
    cy.get("#movieInfo h4").should("exist");
    cy.get("#movieInfo").contains("h5", "Year: ");
  });
  it("Tooltip should be invisible on page load", () => {
    cy.get(".tooltip").should("not.be.visible");
  });
  it("Tooltip should be visible on circle hover", async () => {
    cy.scrollTo(0, 0);
    cy.get("#scatterPlot")
      .get("circle")
      .eq(1)
      .trigger("mouseover", { force: true });
    cy.get(".tooltip").should("be.visible");
  });

  it("Triggers the displayMovieInfo on click", async () => {
    cy.window().then(window => {
      displayMovieInfoSpy = cy.spy(window, "displayMovieInfo");
      cy.get("#scatterPlot")
        .get("circle")
        .eq(2)
        .click({ force: true })
        .then(() => expect(displayMovieInfoSpy).to.be.called);
    });
  });
});
