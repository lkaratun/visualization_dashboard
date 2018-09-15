// const fetch = require("fetch");
import * as app from "./app";
// const app = require("./app");


describe("getListOfYearsFromDB", () => {
  it("returns an array", async () => {
    expect.assertions(2);
    const responseArray = [1900, 1950, 2000];
    const resp = { json: () => responseArray };
    const pr = new Promise((resolve, ) => {
      if (resp) return resolve(resp);
      return null;
    });
    const fetch = jest.fn().mockImplementation(() => pr);

    await expect(app.getListOfYearsFromDB(fetch)).resolves.toBeInstanceOf(Array);
    await expect(app.getListOfYearsFromDB(fetch)).resolves.toEqual(responseArray);
    // return app.getListOfYearsFromDB().then(years => expect(years).toEqual([1, 2, 3]));
  });
});
