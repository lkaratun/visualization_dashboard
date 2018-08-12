import * as countryCodesObj from "./countryCodes.json";
import * as mapData from "./mapData.json";
import "./moveTo";

const countryCodes = Object.values(countryCodesObj);

window.mapData = mapData;

const colorbrewer = require('colorbrewer');
const d3 = require("d3");

window.colorbrewer = colorbrewer;

let filteredData;
const svgWidth = 600;
const svgHeight = 400;
const padding = 40;
const initialMinYear = 1950;
const initialMaxYear = 1960;
let sliderLow;
let sliderHigh;
let yearsChosen = [2017, 2017];
let countriesChosen = [];

let colorScale;
const xDataSelector = 'budget';
const yDataSelector = 'voteAverage';
const rDataSelector = 'popularity';
const cDataSelector = 'runtime';
const xLabel = 'Movie budget';
const yLabel = 'Viewer rating';
let yearData;
const codeLetterToNumeric = new Map();
const codeNumericToLetter = new Map();
const codeNumericToName = new Map();

const imgBaseUrl = 'https://image.tmdb.org/t/p/w154/';
const imgBaseUrlLarge = 'https://image.tmdb.org/t/p/w185/';

const backEndUrlBase = "https://localhost:3000";
// const backEndUrlBase = "https://levkaratun.com:3000";


window.onload = async function init() {
  // [mapData, countryCodes] = await Promise.all([d3.json('mapData.json'), d3.json('countryCodes.json')]);
  // await loadAndDisplayDataFromFile();

  getListOfYearsFromDB().then(years => {
    // setUpYearSlider(d3.min(years), d3.max(years));
  });

  // const movieCount = new Map();
  // allData.forEach(d =>
  //   movieCount.set(d.year, movieCount.get(d.year) + 1 || 1));

  refreshPlots({ years: [initialMinYear, initialMaxYear], countries: countriesChosen });


};

function getListOfYearsFromDB() {
  const requestURL = `${backEndUrlBase}/years`;
  return fetch(requestURL).then(data => data.json()).then(years => years.map(d => +d));
}

function setUpYearSlider(minYear, maxYear) {
  const range = document.getElementById('range');
  noUiSlider.create(range, {
    start: [initialMinYear, initialMaxYear],
    step: 1,
    connect: true,
    direction: 'ltr',
    orientation: 'horizontal',
    behavior: 'tap-drag',
    range: {
      // Slider can go from minYear to maxYear
      min: minYear,
      max: maxYear,
    },
    pips: {
      // Show a scale with the slider
      mode: 'range',
      density: 10,
    },
  });
  const yearInputs = [
    document.getElementById('yearInput1'),
    document.getElementById('yearInput2'),
  ];
  // When the slider value changes, update the input and span
  range.noUiSlider.on('update', (values, handle) => {
    [sliderLow, sliderHigh] = values;
    sliderLow = Math.round(sliderLow);
    sliderHigh = Math.round(sliderHigh);
    yearInputs[handle].value = Math.floor(values[handle]);
  });
  range.noUiSlider.on('set', async (values) => {
    // Convert from string to int
    yearsChosen = values.map(d => Math.round(+d));
    yearData = await loadAndDisplayDataFromDB({ years: [yearsChosen[0], yearsChosen[1]] });
    refreshPlots({ data: yearData, years: yearsChosen, countries: countriesChosen });
  });
  // When the input changes, set the slider value
  yearInputs[0].addEventListener('change', function () {
    range.noUiSlider.set([this.value, null]);
    sliderLow = this.value;
  });
  yearInputs[1].addEventListener('change', function () {
    range.noUiSlider.set([null, this.value]);
    sliderHigh = this.value;
  });
}

function loadAndDisplayDataFromDB(options) {
  const [minYear, maxYear] = options.years;
  const requestURL = `${backEndUrlBase}/getMoviesByYear/${minYear}-${maxYear}`;
  return fetch(requestURL, { credentials: 'omit' }).then(data => data.json());
}

async function refreshPlots(options) {
  const { years, countries } = options;
  yearData = await loadAndDisplayDataFromDB({ years });

  if (countries.length) {
    filteredData = yearData.filter(movie =>
      countries.some(filteredCountry =>
        movie.productionCountries.some(productionCountry =>
          productionCountry.letterCode === filteredCountry)));
  }
  else {
    filteredData = yearData;
  }

  drawScatterPlot({ data: filteredData, years });
  drawMap({ data: filteredData });
  drawBarChart({ data: filteredData });
}

async function drawScatterPlot({ data, years }) {
  const scatterPlot = d3
    .select('#scatterPlot')
    .attr('width', svgWidth)
    .attr('height', svgHeight);

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
    .tickFormat(d => d3.format('.1s')(d));
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(-svgWidth + 2 * padding)
    .tickSizeOuter(0);
  colorScale = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d[cDataSelector]))
    .range([d3.rgb('#66ff33'), d3.rgb('#cc0000')]);
  const radiusScale = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d[rDataSelector]))
    .range([3, 12]);

  scatterPlot.selectAll('g').remove();

  scatterPlot.selectAll('text').remove();

  scatterPlot
    .selectAll('circle')
    .data(data) // , d => d.id)
    .exit()
    .remove();

  // Draw axes
  scatterPlot
    .append('g')
    .call(xAxis)
    .attr('transform', `translate (0, ${svgHeight - padding})`);
  scatterPlot
    .append('g')
    .call(yAxis)
    .attr('transform', `translate (${padding}, 0)`);

  const points = scatterPlot.selectAll('circle').data(filteredData); // , d => d.id);

  const [startYear, endYear] = years;
  const yearsText = startYear === endYear ? `${yLabel} vs ${xLabel} (${startYear})` : `${yLabel} vs ${xLabel} (${startYear} - ${endYear})`;

  // Plot label
  scatterPlot
    .append('text')
    .classed('plotLabel', true)
    .text(yearsText)
    .attr('x', svgWidth / 2)
    .attr('y', padding)
    .attr('dy', '-0.75em')
    .attr('font-size', '1.2em')
    .attr('text-anchor', 'middle');

  // Axes labels
  // X axis
  scatterPlot
    .append('text')
    .text(`${xLabel}. Circle size represents popularity`)
    .attr('x', svgWidth / 2)
    .attr('y', svgHeight - padding)
    .attr('dy', '2em')
    .attr('font-size', '1em')
    .attr('text-anchor', 'middle');

  // Y axis
  scatterPlot
    .append('text')
    .text(yLabel)
    .attr('transform', 'rotate(-90)')
    .attr('x', -svgHeight / 2)
    .attr('y', 0)
    .attr('dy', '0.7em')
    .attr('font-size', '1em')
    .attr('text-anchor', 'middle');

  // Data points
  points
    .enter()
    .append('circle')
    .attr('cx', d => (d[xDataSelector] ? xScale(d[xDataSelector]) : padding))
    .attr(
      'cy',
      d => (d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding),
  )
    .merge(points)
    // .transition()
    // .duration(300)
    // .delay((d, i) => i * 3)
    .attr('cx', d => (d[xDataSelector] ? xScale(d[xDataSelector]) : padding))
    .attr(
      'cy',
      d => (d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding),
  )
    // .attr("fill", d => d[cDataSelector] ? colorScale(d[cDataSelector]) : "#e1e1d0")
    .attr('fill', '#444444')
    // .attr("r", 10)
    .attr(
      'r',
      d =>
        (d[rDataSelector] && d[yDataSelector] && d[xDataSelector]
          ? radiusScale(d[rDataSelector])
          : 0),
  );

  window.points = points;
  points.moveToFront();

  // tooltips
  const tooltip = d3.select('.tooltip');
  scatterPlot
    .selectAll('circle')
    .on('mousemove', (d) => {
      tooltip
        .style('opacity', 1)
        .html(`<b style="display: block">${d.title}</b>
        <img style="display: block" src="${imgBaseUrl +
          d.posterPath}" alt="" />`)
        .style(
          'left',
          `${d3.event.x /* - tooltip.node().offsetWidth/2 */ + 5}px`,
      )
        .style('top', `${d3.event.pageY}px`);
    })
    .on('mouseout', () => tooltip.style('opacity', 0));

  // Show movie info on circle click
  scatterPlot.selectAll('circle').on('click', (d) => {
    displayMovieInfo(d.id);
  });
} // DrawScatterPlot

async function drawMap({ data }) {
  // const mapData = await d3.json('mapData.json');
  // // File containing country codes, particularly letter and numeric versions
  // const countryCodes = await d3.json('countryCodes.json');
  // // Hashmap to convert letter country code to numeric
  // const [mapData, countryCodes] = await Promise.all([d3.json('mapData.json'), d3.json('countryCodes.json')]);

  countryCodes.forEach((d) => {
    codeLetterToNumeric.set(d['alpha-2'], d['country-code']);
    codeNumericToLetter.set(d['country-code'], d['alpha-2']);
    codeNumericToName.set(d['country-code'], d.name);
  });
  const geoData = topojson.feature(mapData, mapData.objects.countries).features;
  geoData.forEach(d => {
    d.properties = {
      movies: [],
    };
  });


  // Fill geoData with Movies data
  data.forEach(row => {
    const countries = geoData.filter(geoDataEntry =>
      row.productionCountries.some(productionCountry =>
        codeLetterToNumeric.get(productionCountry.letterCode) === geoDataEntry.id));
    countries.forEach(country => country.properties.movies.push(row));
  });


  colorScale = d3
    .scaleLinear()
    .domain(d3.extent(geoData, d => d.properties.movies.length))
    .range([colorbrewer.Blues[5][0], colorbrewer.Blues[5][4]]);

  const colorScaleHighlighted = d3
    .scaleLinear()
    .domain(d3.extent(geoData, d => d.properties.movies.length))
    .range([colorbrewer.OrRd[5][0], colorbrewer.OrRd[5][4]]);

  const projection = d3 // d3.geoMercator()
    .geoNaturalEarth1()
    .scale(120)
    .translate([svgWidth * 0.45, svgHeight * 0.5]);

  const path = d3.geoPath().projection(projection);

  const worldMap = d3
    .select('#worldMap')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .selectAll('.country')
    .data(geoData);

  worldMap.exit().remove();

  const defaultCountryFillColor = "#DDDDDD";

  worldMap
    .enter()
    .append('path')
    .classed('country', true)
    .merge(worldMap)
    .attr('d', path)
    .attr(
      'fill',
      d => {
        if (!d.properties.movies.length) { return defaultCountryFillColor; }
        if (countriesChosen.includes(codeNumericToLetter.get(d.id))) { return colorScaleHighlighted(d.properties.movies.length); }
        return colorScale(d.properties.movies.length);
      });


  // Tooltips and click actions
  const tooltip = d3.select('.tooltip');
  d3.select('#worldMap')
    .selectAll('.country')
    .on('mousemove', handleMouseOver)
    .on('mouseout', () => tooltip.style('opacity', 0))
    .on('click', (d) => {
      const countryName = codeNumericToLetter.get(d.id);
      if (d3.event.shiftKey) {
        if (countriesChosen.includes(countryName)) { countriesChosen = countriesChosen.filter(entry => entry !== countryName); }
        else { countriesChosen.push(countryName); }
      }
      // Country was the only one chosen
      else if (JSON.stringify(countriesChosen) === JSON.stringify([countryName])) { countriesChosen = []; }
      // Multiple or no countries were chosen
      else { countriesChosen = [countryName]; }
      refreshPlots({ years: yearsChosen, countries: countriesChosen });
    });

  function handleMouseOver(d) {
    const coords = d3.mouse(this);
    tooltip
      .style('opacity', 1)
      .text(codeNumericToName.get(d.id))
      .style(
        'left',
        `${coords[0] -
        tooltip.node().offsetWidth / 2 +
        document.getElementById('worldMap').getBoundingClientRect().x}px`,
    )
      .style(
        'top',
        `${coords[1] -
        35 +
        document.getElementById('worldMap').getBoundingClientRect().y +
        window.pageYOffset}px`,
    );
  }

  // Plot label
  d3.select('#worldMap')
    .append('text')
    .text('Number of movies per country')
    .attr('x', svgWidth / 2)
    .attr('y', padding)
    .attr('dy', '-0.75em')
    .attr('font-size', '1.2em')
    .attr('text-anchor', 'middle');

  // Color legend (gradient)
  const legendWidth = svgWidth * 0.8;
  const legendHeight = 50;

  const legend = d3
    .select('#worldMap')
    .append('defs')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .append('svg:linearGradient')
    .attr('id', 'gradient')
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '100%')
    .attr('y2', '100%')
    .attr('spreadMethod', 'pad');

  legend
    .append('stop')
    .attr('offset', '0%')
    .attr('stop-color', colorbrewer.Blues[5][1])
    .attr('stop-opacity', 1);

  legend
    .append('stop')
    .attr('offset', '33%')
    .attr('stop-color', colorbrewer.Blues[5][2])
    .attr('stop-opacity', 1);

  legend
    .append('stop')
    .attr('offset', '66%')
    .attr('stop-color', colorbrewer.Blues[5][3])
    .attr('stop-opacity', 1);

  legend
    .append('stop')
    .attr('offset', '100%')
    .attr('stop-color', colorbrewer.Blues[5][4])
    .attr('stop-opacity', 1);

  d3.select('#worldMap')
    .append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight - 30)
    .attr('x', `${svgWidth * 0.1}px`)
    .attr('y', `${svgHeight * 0.95}px`)
    .style('fill', 'url(#gradient)');

  const y = d3
    .scaleLinear()
    .range([0, legendWidth])
    .domain(d3.extent(geoData, d => d.properties.movies.length));

  const yAxis = d3
    .axisBottom()
    .scale(y)
    .ticks(5);

  d3.select('#worldMap')
    .append('g')
    .attr('class', 'y axis')
    .attr('transform', `translate(${svgWidth * 0.1}, ${svgHeight * 0.95})`)
    .call(yAxis);

} // drawMap

function drawBarChart({ data }) {
  // Count number of movies per genre for a given countryId
  let genreData = new Map();
  data.forEach((movie) => {
    movie.genres.forEach((genre) => {
      genreData.set(genre, genreData.get(genre) + 1 || 1);
    });
  });

  const paddingBottom = 10;
  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(Array.from(genreData.values()))])
    .range([svgHeight, paddingBottom + padding]);
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(padding / 3)
    .tickFormat(e => (Math.floor(e) === e ? e : undefined));
  // .tickSizeOuter(0);

  genreData = Array.from(genreData).sort((a, b) => b[1] - a[1]);
  const barPadding = 3;
  const barWidth = Math.min(
    (svgWidth - padding * 2) / genreData.length - barPadding,
    svgWidth / 10,
  );
  // make tallest bar equal svgHeight
  // const barHeightPerOccurrence =
  //   (svgHeight - 2 * padding) / d3.max(genreData, d => d[1]);

  const bars = d3
    .select('#barChart')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .selectAll('.bar')
    .data(genreData, d => d[0]);

  const barLabels = d3
    .select('#barChart')
    .selectAll('.barLabel')
    .data(genreData, d => d[0]);

  barLabels.exit().remove();
  bars.exit().remove();
  d3.select('#barChart')
    .selectAll('g')
    .remove();

  // Bars
  bars
    .enter()
    .append('rect')
    .classed('bar', true)
    .merge(bars)
    .attr('x', (d, i) => padding + (barWidth + barPadding) * i)
    .attr('y', d => yScale(d[1]) - paddingBottom)
    .attr('height', d => svgHeight - yScale(d[1]))
    .attr('width', barWidth)
    // .attr("fill", d => genreColorScale(d[0]));
    .attr('fill', '#4B80B7')
    .attr('opacity', 0.5);

  // Bar labels
  barLabels
    .enter()
    .append('text')
    .classed('barLabel', true)
    .merge(barLabels)
    .text(d => d[0])
    .attr('y', (d, i) => padding + (barWidth + barPadding) * i + barWidth / 2)
    .attr('x', -svgHeight + paddingBottom * 2);

  // Plot label
  // const countryName = codeNumericToName.has(countries)
  //   ? ` filmed in ${codeNumericToName.get(countries)}`
  //   : '';
  d3.select('#barChart')
    .selectAll('.plotLabel')
    .remove();
  d3.select('#barChart')
    .append('text')
    .classed('plotLabel', true)
    .text(`Number of movies per genre`)
    .attr('x', svgWidth / 2)
    .attr('y', padding)
    .attr('dy', '-0.75em')
    .attr('font-size', '1.2em')
    .attr('text-anchor', 'middle');
  // .attr("alignment-baseline", "mathematical");

  // Left axis
  d3.select('#barChart')
    .append('g')
    .call(yAxis)
    .attr('transform', `translate (${padding}, ${-paddingBottom})`);
} // drawBarChart

function displayMovieInfo(id) {
  const [movie] = yearData.filter(d => d.id === id);
  const budget = movie.budget
    .toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    .slice(0, -3);
  const runTime =
    movie.runtime < 60
      ? `${movie.runtime} min`
      : `${Math.floor(movie.runtime / 60)} hr ${movie.runtime % 60} min`;
  let countries = '';
  movie.productionCountries.forEach((country) => {
    countries += `${country.name}, `;
  });
  if (movie.productionCountries.length > 1) {
    countries = `Production countries: ${countries}`;
  } else {
    countries = `Production country: ${countries}`;
  }
  // get rid or comma and space after the last country
  countries = countries.slice(0, -2).replace("United States of America", "USA");

  const htmlString = `
  <img style="display: block; float:left; margin: 10px; height: 95%" src="${imgBaseUrlLarge +
    movie.posterPath}" alt="Image poster not found" />
  <h2 style="text-align: center">${movie.title}</h2>
  <h3>Year: ${movie.releaseYear}<br>
  ${countries}<br>
  Budget: ${budget}<br>
  Runtime: ${runTime}<br>
  Average rating: ${movie.voteAverage}</h3>
  <p>${movie.overview}</p>
  `;
  d3.select('#movieInfo')
    .html(htmlString)
    .style('width', `${svgWidth}px`);
} // displayMovieInfo

module.exports = { getListOfYearsFromDB };