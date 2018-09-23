const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const testApp = {
  outer() {
    return wait(3000).then(this.inner);
  },
  inner: () => {
    console.log("Inner called");
  }
};
describe("TestApp", () => {
  it("should spy on the inner function", async () => {
    const innerSpy = cy.spy(testApp, "inner");
    await testApp.outer();
    expect(innerSpy).to.be.called;
  });
});
