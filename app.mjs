import * as countryCodesObj from "./countryCodes.json";
import * as mapData from "./mapData.json";

const countryCodes = Object.values(countryCodesObj);

const colorbrewer = require("colorbrewer");

const svgWidth = 600;
const svgHeight = 400;
const padding = 40;
const initialMinYear = 1950;
const initialMaxYear = 1951;
const sliderLow = 1900;
let yearsChosen = [initialMinYear, initialMaxYear];
let countriesChosen = [];
let genresChosen = [];

let colorScale;
const xDataSelector = "budget";
const yDataSelector = "voteAverage";
const rDataSelector = "popularity";
const cDataSelector = "runtime";
const xLabel = "Movie budget";
const yLabel = "Viewer rating";
const codeLetterToNumeric = new Map();
const codeNumericToLetter = new Map();
const codeNumericToName = new Map();
const cache = new Map();
window.cache = cache;

const imgBaseUrl = "https://image.tmdb.org/t/p/w154/";
const imgBaseUrlLarge = "https://image.tmdb.org/t/p/w185/";

// const backEndUrlBase = "https://localhost:3000";
const backEndUrlBase = "https://levkaratun.com:3000";

window.onload = async function init() {
  getListOfYearsFromDB().then(years => {
    setUpNewSlider(d3.min(years), d3.max(years));
  });

  countryCodes.forEach(d => {
    codeLetterToNumeric.set(d["alpha-2"], d["country-code"]);
    codeNumericToLetter.set(d["country-code"], d["alpha-2"]);
    codeNumericToName.set(d["country-code"], d.name);
  });

  refreshPlots({
    years: [initialMinYear, initialMaxYear],
    countries: countriesChosen,
    genres: genresChosen
  });
};

function getListOfYearsFromDB() {
  const requestURL = `${backEndUrlBase}/years`;
  return fetch(requestURL)
    .then(res => res.json())
    .then(years => years.map(d => +d));
}

function setUpNewSlider(minYear, maxYear) {
  $("#scale-slider")
    .slider({
      max: maxYear,
      min: sliderLow,
      values: [initialMinYear, initialMaxYear],
      range: true,
      step: 1
    })
    .slider("pips", {
      first: true,
      last: true,
      rest: "label",
      step: 1
    });
  $("#scale-slider").on("slidechange", () => {
    const years = $("#scale-slider").slider("option", "values");
    yearsChosen = years;
    refreshPlots({ years, countries: countriesChosen, genres: genresChosen });
  });
}

async function refreshPlots({ years, countries, genres }) {
  const {
    missing: missingYears,
    existing: existingYears
  } = checkCacheForYearsIntervals(years);
  if (missingYears.length > 0) {
    loadScatterPlotDataFromDB({ years: missingYears, countries, genres }).then(
      data => {
        data.forEach(d => {
          if (typeof d.voteAverage === "object") {
            d.voteAverage = +d.voteAverage.$numberDouble;
          }
          if (typeof d.popularity === "object") {
            d.popularity = +d.popularity.$numberDouble;
          }
          d.releaseYear = parseInt(d.releaseYear, 10);
        });
        // merge data from db and from cache
        const cachedData = readCache(existingYears);
        data = data.concat(cachedData);
        drawScatterPlot({ data, years });
        writeCache(missingYears, data);
      }
    );
  } else {
    drawScatterPlot({ data: readCache(existingYears, "scatterPlot"), years });
  }

  loadMapDataFromDB({ years, genres }).then(data => {
    drawMap({ data });
  });
  loadBarChartDataFromDB({ years, countries }).then(data => {
    drawBarChart({ data });
  });
}
function checkCacheForYearsIntervals(years) {
  const [minYear, maxYear] = years;
  // We can assume that the range of cached years has to be contiguous
  // since both sliders can't be moved at the same time
  const [cachedMin, cachedMax] = d3.extent(Array.from(cache.keys()));
  if (cache.has(minYear)) {
    if (cache.has(maxYear))
      return { missing: [], existing: [minYear, maxYear] };
    return {
      missing: [cachedMax + 1, maxYear],
      existing: [minYear, cachedMax]
    };
  }
  if (cache.has(maxYear))
    return {
      missing: [minYear, cachedMin - 1],
      existing: [cachedMin, maxYear]
    };
  return { missing: [minYear, maxYear], existing: [] };
}

function readCache(years) {
  const [minYear, maxYear] = years;
  let res = [];
  for (let year = minYear; year <= maxYear; year++) {
    const chunk = cache.get(year);
    res = res.concat(chunk);
  }
  return res;
}

function writeCache(years, data) {
  const [minYear, maxYear] = years;
  // Need to have year for each record

  // Loop over each entry in data and put it in cache
  data.forEach(entry => {
    const year = entry["releaseYear"];

    if (cache.has(year)) {
      cache.get(year).push(entry);
    } else {
      cache.set(year, [entry]);
    }
  });

  // Mark empty years with undefined's
  for (let year = minYear; year <= maxYear; year++) {
    if (!cache.has(year)) cache.set(year, []);
  }
}

function loadScatterPlotDataFromDB({ years, countries, genres }) {
  const [startYear, endYear] = years;
  const countriesString = countries.length ? JSON.stringify(countries) : null;
  const genresString = genres.length ? JSON.stringify(genres) : null;
  const requestURL = `${backEndUrlBase}/getScatterPlotData/${countriesString}/${genresString}/${startYear}-${endYear}`;
  return fetch(requestURL, { credentials: "include" }).then(res => res.json());
}

function loadMapDataFromDB({ years, genres }) {
  const [startYear, endYear] = years;
  const genresString = genres.length ? JSON.stringify(genres) : null;
  const requestURL = `${backEndUrlBase}/getMapData/${genresString}/${startYear}-${endYear}`;
  return fetch(requestURL, { credentials: "include" }).then(res => res.json());
}

function loadBarChartDataFromDB({ years, countries }) {
  const [startYear, endYear] = years;
  const letterCodes = countries.length ? JSON.stringify(countries) : null;
  const requestURL = `${backEndUrlBase}/getBarChartData/${letterCodes}/${startYear}-${endYear}`;
  return fetch(requestURL, { credentials: "include" }).then(res => res.json());
}

function getMovieDetails(id) {
  const requestURL = `${backEndUrlBase}/getMovieById/${id}`;
  return fetch(requestURL, { credentials: "include" }).then(res => res.json());
}

async function drawScatterPlot({ data, years }) {
  const scatterPlot = d3
    .select("#scatterPlot")
    .attr("width", svgWidth)
    .attr("height", svgHeight);

  if (data.length === 0) {
    removeOldElements(scatterPlot);
    scatterPlot
      .append("text")
      .attr("class", "placeholder")
      .text("No data points to display")
      .attr("x", svgWidth / 2)
      .attr("y", svgHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-weight", 700);
    return;
  }

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d[xDataSelector]))
    .range([padding, svgWidth - padding]);
  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d[yDataSelector]))
    .range([svgHeight - padding, padding]);
  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(-svgHeight + 2 * padding)
    .tickSizeOuter(0)
    .tickFormat(d => d3.format(".1s")(d));
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(-svgWidth + 2 * padding)
    .tickSizeOuter(0);
  colorScale = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d[cDataSelector]))
    .range([d3.rgb("#66ff33"), d3.rgb("#cc0000")]);
  const radiusScale = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d[rDataSelector]))
    .range([3, 12]);

  removeOldElements(scatterPlot);

  // Draw axes
  scatterPlot
    .append("g")
    .call(xAxis)
    .attr("transform", `translate (0, ${svgHeight - padding})`);
  scatterPlot
    .append("g")
    .call(yAxis)
    .attr("transform", `translate (${padding}, 0)`);

  const points = scatterPlot.selectAll("circle").data(data); // , d => d.id);

  const [startYear, endYear] = years;
  const yearsText =
    startYear === endYear
      ? `${yLabel} vs ${xLabel} (${startYear})`
      : `${yLabel} vs ${xLabel} (${startYear} - ${endYear})`;

  addLabel(scatterPlot, yearsText);
  addNote(scatterPlot, "(click a circle to see detailed movie info)");

  // Axes labels
  // X axis
  scatterPlot
    .append("text")
    .text(`${xLabel}. Circle size represents popularity`)
    .attr("x", svgWidth / 2)
    .attr("y", svgHeight - padding)
    .attr("dy", "2em")
    .attr("font-size", "1em")
    .attr("text-anchor", "middle");

  // Y axis
  scatterPlot
    .append("text")
    .text(yLabel)
    .attr("transform", "rotate(-90)")
    .attr("x", -svgHeight / 2)
    .attr("y", 0)
    .attr("dy", "0.7em")
    .attr("font-size", "1em")
    .attr("text-anchor", "middle");

  // Data points
  points
    .enter()
    .append("circle")
    .merge(points)
    .attr("cx", d => (d[xDataSelector] ? xScale(d[xDataSelector]) : padding))
    .attr(
      "cy",
      d => (d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding)
    )
    .attr("fill", "#444444")
    .attr("r", d => radiusScale(d[rDataSelector]));

  points.raise();

  // tooltips
  const tooltip = d3.select(".tooltip");
  scatterPlot
    .selectAll("circle")
    .on("mousemove", d => {
      tooltip
        // .style("opacity", 1)
        .style("display", "block")
        .html(
          `<b style="display: block">${d.title}</b>
        <img style="display: block" src="${imgBaseUrl +
          d.posterPath}" alt="" />`
        )
        .style(
          "left",
          `${d3.event.x /* - tooltip.node().offsetWidth/2 */ + 5}px`
        )
        .style("top", `${d3.event.pageY}px`);
    })
    // .on("mouseout", () => tooltip.style("opacity", 0));
    .on("mouseout", () => tooltip.style("display", "none"));

  // Show movie info on circle click
  scatterPlot.selectAll("circle").on("click", d => displayMovieInfo(d.id));

  function removeOldElements(selection) {
    selection.selectAll("g").remove();
    selection.selectAll("text").remove();
    selection
      .selectAll("circle")
      .data(data) // , d => d.id)
      .exit()
      .remove();
  }
} // DrawScatterPlot

async function drawMap({ data }) {
  // const worldMap = d3.select("#worldMap");
  const geoData = topojson.feature(mapData, mapData.objects.countries).features;

  const countryCodeToMovieCount = new Map();
  data.forEach(country =>
    countryCodeToMovieCount.set(country._id, country.count)
  );

  colorScale = d3
    .scaleLinear()
    .domain(d3.extent(Array.from(countryCodeToMovieCount.values())))
    .range([colorbrewer.Blues[5][0], colorbrewer.Blues[5][4]]);

  const projection = d3
    .geoNaturalEarth1()
    .scale(140)
    .translate([svgWidth * 0.47, svgHeight * 0.58]);

  const path = d3.geoPath().projection(projection);

  const worldMap = d3
    .select("#worldMap")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .selectAll(".country")
    .data(geoData);

  worldMap.exit().remove();

  const defaultCountryFillColor = "#DDDDDD";

  worldMap
    .enter()
    .append("path")
    .attr("class", "country")
    .merge(worldMap)
    .attr("d", path)
    .attr("fill", d => {
      const movieCount = countryCodeToMovieCount.get(
        codeNumericToLetter.get(d.id)
      );
      if (movieCount) {
        return colorScale(movieCount);
      }
      return defaultCountryFillColor;
    })
    .attr(
      "stroke",
      d =>
        countriesChosen.includes(codeNumericToLetter.get(d.id))
          ? "#444444"
          : "blue"
    )
    .attr(
      "stroke-width",
      d =>
        countriesChosen.includes(codeNumericToLetter.get(d.id)) ? "1px" : "0"
    );

  // Tooltips and click actions
  d3.select("#worldMap").on("click", () => {
    if (d3.event.target.id === "worldMap") {
      // clear countries selected
      countriesChosen = [];
      refreshPlots({
        years: yearsChosen,
        countries: countriesChosen,
        genres: genresChosen
      });
    }
  });

  const tooltip = d3.select(".tooltip");
  d3.select("#worldMap")
    .selectAll(".country")
    .on("mousemove", handleMouseOver)
    .on("mouseout", handleMouseOut)
    .on("click", d => {
      const countryName = codeNumericToLetter.get(d.id);
      // Add country to the list of chosen ones if shift was pressed
      if (d3.event.shiftKey) {
        if (countriesChosen.includes(countryName)) {
          countriesChosen = countriesChosen.filter(
            entry => entry !== countryName
          );
        } else {
          countriesChosen.push(countryName);
        }
      }
      // Country was the only one chosen
      else if (
        JSON.stringify(countriesChosen) === JSON.stringify([countryName])
      ) {
        countriesChosen = [];
      }
      // Multiple or no countries were chosen
      else {
        countriesChosen = [countryName];
      }
      refreshPlots({
        years: yearsChosen,
        countries: countriesChosen,
        genres: genresChosen
      });
    });

  function handleMouseOver(d) {
    const coords = d3.mouse(this);
    tooltip
      .style("opacity", 1)
      .text(codeNumericToName.get(d.id))
      .style(
        "left",
        `${coords[0] -
          tooltip.node().offsetWidth / 2 +
          document.getElementById("worldMap").getBoundingClientRect().x}px`
      )
      .style(
        "top",
        `${coords[1] -
          35 +
          document.getElementById("worldMap").getBoundingClientRect().y +
          window.pageYOffset}px`
      );
  }
  function handleMouseOut() {
    tooltip.style("opacity", 0);
  }

  addLabel(d3.select("#worldMap"), "Number of movies per country");
  addNote(
    d3.select("#worldMap"),
    "(click to filter by country, shift+click to select multiple countries)"
  );

  // Color legend (gradient)
  const legendWidth = svgWidth * 0.8;
  const legendHeight = 50;

  await d3
    .select("#worldMap")
    .selectAll("g")
    .remove();

  const legend = d3
    .select("#worldMap")
    .append("defs")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .append("svg:linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "100%")
    .attr("y2", "100%")
    .attr("spreadMethod", "pad");

  legend
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colorbrewer.Blues[5][1])
    .attr("stop-opacity", 1);

  legend
    .append("stop")
    .attr("offset", "33%")
    .attr("stop-color", colorbrewer.Blues[5][2])
    .attr("stop-opacity", 1);

  legend
    .append("stop")
    .attr("offset", "66%")
    .attr("stop-color", colorbrewer.Blues[5][3])
    .attr("stop-opacity", 1);

  legend
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colorbrewer.Blues[5][4])
    .attr("stop-opacity", 1);

  d3.select("#worldMap")
    .append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight - 30)
    .attr("x", `${svgWidth * 0.1}px`)
    .attr("y", `${svgHeight * 0.95}px`)
    .style("fill", "url(#gradient)");

  const y = d3
    .scaleLinear()
    .range([0, legendWidth])
    .domain(d3.extent(Array.from(countryCodeToMovieCount.values())));

  const yAxis = d3
    .axisBottom()
    .scale(y)
    .ticks(5);

  d3.select("#worldMap")
    .append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${svgWidth * 0.1}, ${svgHeight * 0.95})`)
    .call(yAxis);
} // drawMap

function drawBarChart({ data }) {
  const barChart = d3.select("#barChart");

  // Number of movies per genre
  const genreToMovieCount = new Map();
  data.forEach(genre => genreToMovieCount.set(genre._id, genre.count));
  const genreData = Array.from(genreToMovieCount.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const barPadding = 3;
  const barWidth = Math.min(
    (svgWidth - padding * 2) / Array.from(genreToMovieCount.values()).length -
      barPadding,
    svgWidth / 10
  );
  const bars = barChart
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .selectAll(".bar")
    .data(genreData, d => d[0]);

  const barLabels = barChart.selectAll(".barLabel").data(genreData, d => d[0]);

  if (data.length === 0) {
    barLabels.remove();
    bars.remove();
    barChart.selectAll("g").remove();
    barChart.selectAll("rect").remove();
    barChart.selectAll("text").remove();

    barChart
      .append("text")
      .attr("class", "placeholder")
      .text("No data points to display")
      .attr("x", svgWidth / 2)
      .attr("y", svgHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-weight", 700);
    return;
  }

  const paddingBottom = 10;
  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(genreData, d => d[1])])
    .range([svgHeight, paddingBottom + padding]);

  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(padding / 3)
    .tickFormat(e => (Math.floor(e) === e ? e : undefined));
  // .tickSizeOuter(0);

  barLabels.exit().remove();
  bars.exit().remove();
  barChart.selectAll("g").remove();
  barChart.selectAll(".placeholder").remove();

  // Bars
  bars
    .enter()
    .append("rect")
    .attr("class", "bar")
    .merge(bars)
    .attr("x", (d, i) => padding + (barWidth + barPadding) * i)
    .attr("y", d => yScale(d[1]) - paddingBottom)
    .attr("height", d => svgHeight - yScale(d[1]))
    .attr("width", barWidth)
    .attr("fill", "#4B80B7")
    .attr("opacity", 0.5)
    .on("click", d => handleClick(d[0]))
    .attr("stroke", d => (genresChosen.includes(d[0]) ? "#222222" : "blue"))
    .attr("stroke-width", d => (genresChosen.includes(d[0]) ? "2px" : "0"));

  function handleClick(genreName) {
    if (d3.event.shiftKey) {
      if (genresChosen.includes(genreName)) {
        genresChosen = genresChosen.filter(entry => entry !== genreName);
      } else {
        genresChosen.push(genreName);
      }
    }
    // Genre was the only one chosen
    else if (JSON.stringify(genresChosen) === JSON.stringify([genreName])) {
      genresChosen = [];
    }
    // Multiple or no genres were chosen
    else {
      genresChosen = [genreName];
    }
    refreshPlots({
      years: yearsChosen,
      countries: countriesChosen,
      genres: genresChosen
    });
  }

  // Clear selected genres list on empty space click
  barChart.on("click", () => {
    if (d3.event.target.id === "barChart") {
      // clear countries selected
      genresChosen = [];
      refreshPlots({
        years: yearsChosen,
        countries: countriesChosen,
        genres: genresChosen
      });
    }
  });

  // Bar labels
  barLabels
    .enter()
    .append("text")
    .attr("class", "barLabel")
    .merge(barLabels)
    .text(d => d[0])
    .attr("y", (d, i) => padding + (barWidth + barPadding) * i + barWidth / 1.5)
    .attr("x", -svgHeight + paddingBottom * 2)
    .on("click", d => handleClick(d[0]));

  addLabel(barChart, "Number of movies per genre");
  addNote(
    barChart,
    "(click to filter by genre, shift+click to select multiple genres)"
  );

  // Left axis
  barChart
    .append("g")
    .call(yAxis)
    .attr("transform", `translate (${padding}, ${-paddingBottom})`);
} // drawBarChart

function addLabel(selection, labelText) {
  selection
    .append("text")
    .attr("class", "plotLabel")
    .text(labelText)
    .attr("x", svgWidth / 2)
    .attr("y", 0)
    .attr("dy", "0.75em")
    .attr("font-size", "1.2em")
    .attr("text-anchor", "middle");
}

function addNote(selection, noteText) {
  selection
    .append("text")
    .text(noteText)
    .attr("x", svgWidth / 2)
    .attr("y", 0)
    .attr("dy", "2.4em")
    .attr("font-size", "0.7em")
    .attr("text-anchor", "middle");
}

async function displayMovieInfo(id) {
  const movie = await getMovieDetails(id);
  const budget = movie.budget
    .toLocaleString("en-US", { style: "currency", currency: "USD" })
    .slice(0, -3);
  const runTime =
    movie.runtime < 60
      ? `${movie.runtime} min`
      : `${Math.floor(movie.runtime / 60)} hr ${movie.runtime % 60} min`;
  let countries = "";
  movie.productionCountries.forEach(country => {
    countries += `${country.name}, `;
  });
  if (movie.productionCountries.length > 1) {
    countries = `Production countries: ${countries}`;
  } else {
    countries = `Production country: ${countries}`;
  }
  // get rid or comma and space after the last country
  countries = countries.slice(0, -2).replace("United States of America", "USA");

  const rating =
    typeof movie.voteAverage === "object"
      ? +movie.voteAverage.$numberDouble
      : movie.voteAverage;
  const htmlString = `
  <img style="display: block; float:left; margin: 1%; height: auto; width: 256px;" src="${imgBaseUrlLarge +
    movie.posterPath}" alt="Image poster not found" />
  <h4 style="text-align: center">${movie.title}</h4>
  <h5>Year: ${movie.releaseYear}<br>
  ${countries}<br>
  Budget: ${budget}<br>
  Runtime: ${runTime}<br>
  Average rating: ${rating}</h5>
  <p>${movie.overview}</p>
  `;
  d3.select("#movieInfo")
    .html(htmlString)
    .style("width", `${svgWidth}px`);
} // displayMovieInfo

module.exports = { getListOfYearsFromDB, displayMovieInfo };
window.displayMovieInfo = displayMovieInfo;
