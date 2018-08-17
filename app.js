import * as countryCodesObj from "./countryCodes.json";
import * as mapData from "./mapData.json";

const countryCodes = Object.values(countryCodesObj);

const colorbrewer = require('colorbrewer');
const d3 = require("d3");

const svgWidth = 600;
const svgHeight = 400;
const padding = 40;
const initialMinYear = 1950;
const initialMaxYear = 1960;
let sliderLow;
let sliderHigh;
let yearsChosen = [initialMinYear, initialMaxYear];
let countriesChosen = [];

let colorScale;
const xDataSelector = 'budget';
const yDataSelector = 'voteAverage';
const rDataSelector = 'popularity';
const cDataSelector = 'runtime';
const xLabel = 'Movie budget';
const yLabel = 'Viewer rating';
const codeLetterToNumeric = new Map();
const codeNumericToLetter = new Map();
const codeNumericToName = new Map();

const imgBaseUrl = 'https://image.tmdb.org/t/p/w154/';
const imgBaseUrlLarge = 'https://image.tmdb.org/t/p/w185/';


const backEndUrlBase = "https://localhost:3000";
// const backEndUrlBase = "https://levkaratun.com:3000";

window.onload = async function init() {
  getListOfYearsFromDB().then(years => {
    setUpYearSlider(d3.min(years), d3.max(years));
  });

  countryCodes.forEach((d) => {
    codeLetterToNumeric.set(d['alpha-2'], d['country-code']);
    codeNumericToLetter.set(d['country-code'], d['alpha-2']);
    codeNumericToName.set(d['country-code'], d.name);
  });

  refreshPlots({ years: [initialMinYear, initialMaxYear], countries: countriesChosen });


};

function getListOfYearsFromDB() {
  const requestURL = `${backEndUrlBase}/years`;
  return fetch(requestURL).then(res => res.json()).then(years => years.map(d => +d));
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
    // data = await loadDataFromDB({ years: [yearsChosen[0], yearsChosen[1]] });
    refreshPlots({ years: yearsChosen, countries: countriesChosen });
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

function loadScatterPlotDataFromDB({ years, countries }) {
  const [startYear, endYear] = years;
  let letterCodes = null;
  if (countries.length) letterCodes = JSON.stringify(countries);
  const requestURL = `${backEndUrlBase}/getScatterPlotData/${letterCodes}/${startYear}-${endYear}`;
  return fetch(requestURL, { credentials: 'include' }).then(res => res.json());
}

function loadMapDataFromDB({ years, countries }) {
  const [startYear, endYear] = years;
  let letterCodes = null;
  if (countries.length) letterCodes = JSON.stringify(countries);
  const requestURL = `${backEndUrlBase}/getCountByCountry/${letterCodes}/${startYear}-${endYear}`;
  return fetch(requestURL, { credentials: 'include' }).then(res => res.json());
}

function loadBarChartDataFromDB({ years, countries }) {
  const [startYear, endYear] = years;
  let letterCodes = null;
  if (countries.length) letterCodes = JSON.stringify(countries);
  const requestURL = `${backEndUrlBase}/getBarChartData/${letterCodes}/${startYear}-${endYear}`;
  return fetch(requestURL, { credentials: 'include' }).then(res => res.json());
}

function getMovieDetails(id) {
  const requestURL = `${backEndUrlBase}/getMovieById/${id}`;
  return fetch(requestURL, { credentials: 'include' }).then(res => res.json());
}



async function refreshPlots({ years, countries }) {
  loadScatterPlotDataFromDB({ years, countries }).then(data => {
    data.forEach(d => {
      if (typeof d.voteAverage === "object") { d.voteAverage = +d.voteAverage.$numberDouble; }
      if (typeof d.popularity === "object") { d.popularity = +d.popularity.$numberDouble; }
    });

    drawScatterPlot({ data, years });
  });

  loadMapDataFromDB({ years, countries }).then((data) => drawMap({ data }));
  loadBarChartDataFromDB({ years, countries }).then((data) => drawBarChart({ data }));
}

async function drawScatterPlot({ data, years }) {
  const scatterPlot = d3
    .select('#scatterPlot')
    .attr('width', svgWidth)
    .attr('height', svgHeight);

  if (data.length === 0) {
    removeOldElements(scatterPlot);
    scatterPlot
      .append("text")
      .classed("placeholder", true)
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

  removeOldElements(scatterPlot);

  // Draw axes
  scatterPlot
    .append('g')
    .call(xAxis)
    .attr('transform', `translate (0, ${svgHeight - padding})`);
  scatterPlot
    .append('g')
    .call(yAxis)
    .attr('transform', `translate (${padding}, 0)`);

  const points = scatterPlot.selectAll('circle').data(data); // , d => d.id);

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
      d =>
        (d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding)

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
    .attr('fill', '#444444')
    .attr(
      'r',
      d => radiusScale(d[rDataSelector])
    );

  window.points = points;
  points.raise();

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

  function removeOldElements(selection) {
    selection.selectAll('g').remove();
    selection.selectAll('text').remove();
    selection
      .selectAll('circle')
      .data(data) // , d => d.id)
      .exit()
      .remove();
  }
} // DrawScatterPlot

async function drawMap({ data }) {
  const geoData = topojson.feature(mapData, mapData.objects.countries).features;

  const countryCodeToMovieCount = new Map();
  data.forEach(country => countryCodeToMovieCount.set(country._id, country.count));

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
        const movieCount = countryCodeToMovieCount.get(codeNumericToLetter.get(d.id));
        if (movieCount) {
          return colorScale(movieCount);
        }
        return defaultCountryFillColor;
      }
    )
    .attr("stroke", d => countriesChosen.includes(codeNumericToLetter.get(d.id)) ? "#444444" : "blue")
    .attr("stroke-width", d => countriesChosen.includes(codeNumericToLetter.get(d.id)) ? "1px" : "0");


  // Tooltips and click actions
  d3.select('#worldMap')
    .on('click', () => {
      if (d3.event.target.id === "worldMap") {
        // clear countries selected
        countriesChosen = [];
        refreshPlots({ years: yearsChosen, countries: countriesChosen });
      }
    });

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
    .attr('y', 0)
    .attr('dy', '0.75em')
    .attr('font-size', '1.2em')
    .attr('text-anchor', 'middle');

  // Bottom note
  d3.select('#worldMap')
    .append('text')
    .text('(click to filter by country, shift+click to select multiple countries)')
    .attr('x', svgWidth / 2)
    .attr('y', 0)
    .attr('dy', '2.4em')
    .attr('font-size', '0.7em')
    .attr('text-anchor', 'middle');


  // Color legend (gradient)
  const legendWidth = svgWidth * 0.8;
  const legendHeight = 50;

  await d3.select('#worldMap')
    .selectAll('g')
    .remove();

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
    .domain(d3.extent(Array.from(countryCodeToMovieCount.values())));

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
  const barChart = d3.select('#barChart');

  // Number of movies per genre
  const genreToMovieCount = new Map();
  data.forEach(genre => genreToMovieCount.set(genre._id, genre.count));
  const genreData = Array.from(genreToMovieCount.entries()).sort((a, b) => b[1] - a[1]);

  const barPadding = 3;
  const barWidth = Math.min(
    (svgWidth - padding * 2) / Array.from(genreToMovieCount.values()).length - barPadding,
    svgWidth / 10,
  );
  const bars = barChart
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .selectAll('.bar')
    .data(genreData, d => d[0]);

  const barLabels = barChart
    .selectAll('.barLabel')
    .data(genreData, d => d[0]);

  if (data.length === 0) {
    barLabels.remove();
    bars.remove();
    barChart
      .selectAll('g')
      .remove();
    barChart
      .selectAll('rect')
      .remove();
    barChart
      .selectAll('text')
      .remove();

    barChart
      .append("text")
      .classed("placeholder", true)
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
  barChart
    .selectAll('g')
    .remove();
  barChart
    .selectAll('.placeholder')
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
    .attr('y', (d, i) => padding + (barWidth + barPadding) * i + barWidth / 1.5)
    .attr('x', -svgHeight + paddingBottom * 2);

  barChart
    .selectAll('.plotLabel')
    .remove();
  barChart
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
  barChart
    .append('g')
    .call(yAxis)
    .attr('transform', `translate (${padding}, ${-paddingBottom})`);
} // drawBarChart

async function displayMovieInfo(id) {
  const movie = await getMovieDetails(id);

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