const puppeteer = require("puppeteer");

// import * as app from "../app";

const initialMinYear = 1950;
const initialMaxYear = 1960;
const yearsChosen = [initialMinYear, initialMaxYear];
const countriesChosen = [];
const genresChosen = [];

(async () => {
  const browser = await puppeteer.launch({
    // headless: false,
    slowMo: 200
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:1234", {
    waituntil: ["load", "domcontentloaded", "networkidle0"]
  });
  h1text = await page.$eval("#scatterPlot", d => d.innerHTML);

  console.log(h1text);
  // await page.waitForNavigation({ waituntil: "networkidle2" });
  await page.screenshot({ path: "localhost.png" });

  await browser.close();
})();

// beforeEach(() => {
//   app
//     .loadScatterPlotDataFromDB({ yearsChosen, countriesChosen, genresChosen })
//     .then(data => {
//       data.forEach(d => {
//         if (typeof d.voteAverage === "object") {
//           d.voteAverage = +d.voteAverage.$numberDouble;
//         }
//         if (typeof d.popularity === "object") {
//           d.popularity = +d.popularity.$numberDouble;
//         }
//       });

//       const scatterPlot = d3
//         .select("#scatterPlot")
//         .attr("width", app.svgWidth)
//         .attr("height", app.svgHeight);
//       const points = scatterPlot.selectAll("circle").data(data);

//       points
//         .enter()
//         .append("circle")
//         .merge(points)
//         .attr("fill", "#444444");
//     });
// });

// describe("Scatter plot", () => {
//   beforeAll(async () => {
//     await page.goto("http://localhost:1234");
//   });

//   it('Should display "Movie data visualization" text on page', async () => {
//     await expect(page).toMatch("Movie data visualization");
//   });

//   it("Scatter plot svg should exist on the page", async () => {
//     const plot = await page.$("h1");
//     const w = await plot.jsonValue();
//     const header = await page.$eval("h1", d => d);
//     console.log("plot", header);

//     return expect(page.$("#scatterPlot")).resolves.toBeDefined();
//   });
//   // console.log('page.$("#scatterPlot")', await page.$("#scatterPlot"));

//   it("Scatter plot should contain at least one circle", async () => {
//     await expect(page.$("#scatterPlot")).resolves.toContain;
//   });
// });
