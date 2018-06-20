let prevCountryId;
// let filename;
// let link;
const svgWidth = 600;
const svgHeight = 400;
const padding = 40;
const scatterPlot = d3
  .select('#scatterPlot')
  .attr('width', svgWidth)
  .attr('height', svgHeight);

let sliderLow;
let sliderHigh;

// let xScale;
// let yScale;
let colorScale;
const year = 1995;
let yearData;
let yearsList = new Set();
const xDataSelector = 'budget';
const yDataSelector = 'vote_average';
const rDataSelector = 'popularity';
const cDataSelector = 'runtime';
const xLabel = 'Movie budget';
const yLabel = 'Viewer rating';
let allData;
const imgBaseUrl = 'http://image.tmdb.org/t/p/w154/';
const imgBaseUrlLarge = 'http://image.tmdb.org/t/p/w300/';
const codeLetterToNumeric = new Map();
const codeNumericToName = new Map();

// const genreNames = [
//   'Animation',
//   'Comedy',
//   'Family',
//   'Adventure',
//   'Fantasy',
//   'Drama',
//   'Romance',
//   'Action',
//   'Crime',
//   'Thriller',
//   'History',
//   'Science Fiction',
//   'Mystery',
//   'Horror',
//   'War',
//   'Foreign',
//   'Western',
//   'Documentary',
//   'Music',
//   'TV Movie',
// ];
// let genreColors = ["rgba(0, 255, 255, 0.5)", "rgba(255, 212, 0, 0.4)",
// "hsla(20, 100%, 50%, 0.4)", "rgba(157, 0, 255, 0.7)",
//   "rgba(255, 0, 199, 0.61)", "rgba(106, 0, 255, 0.74)",
// "rgba(233, 0, 255, 0.5)", "rgba(0, 127, 255, 0.8)",
//   "rgba(0, 13, 204, 0.65)", "rgba(70, 42, 42, 0.9)"
// ];
// const genreColors = [
//   '#5cbae6',
//   '#b6d957',
//   '#fac364',
//   '#8cd3ff',
//   '#d998cb',
//   '#f2d249',
//   '#93b9c6',
//   '#ccc5a8',
//   '#52bacc',
//   '#dbdb46',
//   '#98aafb',
// ];

// const genreColorScale = d3
//   .scaleOrdinal()
//   .domain(genreNames)
//   .range(genreColors);

window.onload = async function init() {
  await loadAndDisplayData();

  // Set up year slider
  const range = document.getElementById('range');
  const minYear = d3.min(yearsList);
  const maxYear = d3.max(yearsList);

  noUiSlider.create(range, {
    start: [1950, 1970], // Handle start position
    step: 1, // Slider moves in increments of '10'
    connect: true, // Display a colored bar between the handles
    direction: 'ltr', // Put '0' at the bottom of the slider
    orientation: 'horizontal', // Orient the slider vertically
    behaviour: 'tap-drag', // Move handle on tap, bar is draggable
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
    // debugger;
    [sliderLow, sliderHigh] = values;
    yearInputs[handle].value = Math.floor(values[handle]);
    drawScatterPlot([sliderLow, sliderHigh]);
    drawMap([sliderLow, sliderHigh]);
    drawBarChart(undefined, [sliderLow, sliderHigh]);
  });

  // When the input changes, set the slider value
  yearInputs[0].addEventListener('change', () => {
    range.noUiSlider.set([this.value, null]);
    sliderLow = this.value;
  });
  yearInputs[1].addEventListener('change', () => {
    range.noUiSlider.set([null, this.value]);
    sliderHigh = this.value;
  });
}; // window.onload

async function loadAndDisplayData() {
  return d3
    .dsv('|', 'allData.dsv', (row) => {
      yearsList.add(+row.year);
      // console.log(row);

      return {
        id: +row.id,
        name: row.name,
        year: +row.year,
        budget: +row.budget,
        popularity: +row.popularity,
        runtime: +row.runtime,
        vote_average: +row.vote_average,
        poster_path: row.poster_path,
        production_countries: JSON.parse(row.production_countries.replace(/'/g, '"')),
        overview: row.overview,
        genres: JSON.parse(row.genres),
      };
    })
    .then(async (filteredMovies) => {
      allData = filteredMovies;

      yearsList = Array.from(yearsList).sort((a, b) => a - b);
      const movieCount = new Map();
      allData.forEach(d =>
        movieCount.set(d.year, movieCount.get(d.year) + 1 || 1), );
      // values of year slider

      const indicesList = [];
      yearsList.forEach((value, index) => indicesList.push(index));
      // const yearScale = d3
      //   .scaleOrdinal()
      //   .domain(indicesList)
      //   .range(yearsList);
      // slider
      //   .attr("min", 0)
      //   .attr("max", yearsList.length - 1)
      //   .attr("value", yearsList.length - 1);
      console.log(allData);
      drawScatterPlot([2017, 2017]);
      drawMap([2017, 2017]);
      // displayMovieInfo(862);
      // 124 is Canada
      drawBarChart(undefined, [2017, 2017]);
    })
    .catch((e) => {
      console.log(e);
      // Retrieve all data from movies_metadata.csv and store it in allData array. Store selected year's data in yearData array
      d3.csv('movies_metadata.csv', (row) => {
        // Only keep rows with all keys having valid values
        if (
          !row[xDataSelector] ||
          !row[yDataSelector] ||
          !row[rDataSelector] ||
          !row[cDataSelector] ||
          !row.release_date ||
          !row.title
        ) {
          return false;
        }
        yearsList.add(+row.release_date.slice(0, 4));

        return {
          id: +row.id,
          name: row.title,
          year: +row.release_date.slice(0, 4),
          budget: +row.budget,
          popularity: +row.popularity,
          runtime: +row.runtime,
          vote_average: +row.vote_average,
          poster_path: row.poster_path,
          production_countries: row.production_countries,
          overview: row.overview,
          genres: row.genres.replace(/'/g, '"'),
        };
      })
        .then((response) => {
          allData = response;
          downloadCSV();
          // loadAndDisplayData(tryLoadingData);
        })
        .catch((e2) => {
          console.log(e2);
        });
    }
    );
} // loadAndDisplayData

function drawScatterPlot(years, filteredCountries = undefined) {
  yearData = allData.filter(d => d.year >= years[0] && d.year <= years[1]);
  // debugger;
  if (filteredCountries) {
    yearData = yearData.filter(movie =>
      filteredCountries.some(filteredCountry =>
        movie.production_countries.some(productionCountry =>
          codeLetterToNumeric.get(productionCountry.iso_3166_1) ===
          filteredCountry, ), ), );
    console.log(yearData);
  }

  // Choose whether to use all data or current year's data for axes and grid scaling
  const dataForScaling = d3.select('#scaleGlobal').property('checked')
    ? allData
    : yearData;

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(dataForScaling, d => d[xDataSelector]))
    .range([padding, svgWidth - padding]);
  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(dataForScaling, d => d[yDataSelector]))
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
    .domain(d3.extent(yearData, d => d[cDataSelector]))
    .range([d3.rgb('#66ff33'), d3.rgb('#cc0000')]);
  const radiusScale = d3
    .scaleLinear()
    .domain(d3.extent(yearData, d => d[rDataSelector]))
    .range([3, 12]);

  scatterPlot.selectAll('g').remove();

  scatterPlot.selectAll('text').remove();

  scatterPlot
    .selectAll('circle')
    .data(yearData) // , d => d.id)
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

  const points = scatterPlot.selectAll('circle').data(yearData); // , d => d.id);

  // Plot label
  scatterPlot
    .append('text')
    .text(`${yLabel} vs ${xLabel} (${year})`)
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
    .attr('dy', '1.5em')
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

  points.moveToFront();

  // tooltips
  const tooltip = d3.select('.tooltip');
  scatterPlot
    .selectAll('circle')
    .on('mousemove', (d) => {
      tooltip
        .style('opacity', 1)
        .html(`
        <b style="display: block">${d.name}</b>
        <img style="display: block" src="${imgBaseUrl +
          d.poster_path}" alt="" />


        `, )
        .style(
          'left',
          `${d3.event.x /* - tooltip.node().offsetWidth/2 */ + 5}px`,
      )
        .style('top', `${d3.event.y}px`);
    })
    .on('mouseout', () => tooltip.style('opacity', 0));

  // Show movie info on circle click
  scatterPlot.selectAll('circle').on('click', (d) => {
    console.log(d);
    displayMovieInfo(d.id);
  });
} // DrawScatterPlot

// slider.on("input", () => {
//   // console.log(yearScale(+d3.event.target.value));
//   d3.select("#sliderLabel").text(`Year: ${yearScale(+d3.event.target.value)}`);
//   drawScatterPlot(yearScale(+d3.event.target.value));
//   drawMap(yearScale(+d3.event.target.value));
// });

async function drawMap(years) {
  // already did this in drawScatterPlot
  yearData = allData.filter(d => d.year >= years[0] && d.year <= years[1]);

  const mapData = await d3.json('mapData.json');
  // File containing country codes, particularly letter and numeric versions
  const countryCodes = await d3.json('countryCodes.json');
  // Hashmap to convert letter country code to numeric

  countryCodes.forEach((d) => {
    codeLetterToNumeric.set(d['alpha-2'], d['country-code']);
    codeNumericToName.set(d['country-code'], d.name);
  });
  const geoData = topojson.feature(mapData, mapData.objects.countries).features;
  geoData.forEach(d => {
    d.properties = {
      movies: [],
    }
  });

  // Fill geoData with Movies data
  yearData.forEach((row) => {
    const countries = geoData.filter((geoDataEntry) => {
      row.production_countries.forEach(productionCountry => {
        if (
          codeLetterToNumeric.get(productionCountry.iso_3166_1) ===
          geoDataEntry.id
        ) {
          return true;
        }
        return false;
      });
      return false;
    });
    countries.forEach(country => country.properties.movies.push(row));
  });

  colorScale = d3
    .scaleLinear()
    // Adding 1 for log scale to work correctly
    .domain(d3.extent(geoData, d => d.properties.movies.length))
    .range([colorbrewer.Blues[5][0], colorbrewer.Blues[5][4]]);

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

  worldMap
    .enter()
    .append('path')
    .classed('country', true)
    .merge(worldMap)
    .attr('d', path)
    .attr(
      'fill',
      d =>
        (d.properties.movies.length
          ? colorScale(d.properties.movies.length)
          : "#DDDDDD"),
  );

  // Self-made tooltips
  const tooltip = d3.select('.tooltip');
  d3.select('#worldMap')
    .selectAll('.country')
    .on('mousemove', handleMouseOver)
    .on('mouseout', () => tooltip.style('opacity', 0))
    .on('click', (d) => {
      drawBarChart(d.id, years);
      drawScatterPlot(years, [d.id]);
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
  // .append("text")
  // .attr("transform", "rotate(-90)")
  // .attr("y", 0)
  // .attr("dy", ".71em")
  // .style("text-anchor", "end")
  // .text("axis title");
} // drawMap

function displayMovieInfo(id) {
  const [movie] = allData.filter(d => d.id === id);
  const budget = movie.budget
    .toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    .slice(0, -3);
  const runTime =
    movie.runtime < 60
      ? `${movie.runtime} min`
      : `${Math.floor(movie.runtime / 60)} hr ${movie.runtime % 60} min`;
  let countries = '';
  movie.production_countries.forEach((country) => {
    countries += `${country.name}, `;
  });
  if (movie.production_countries.length > 1) {
    countries = `Production countries: ${countries}`;
  } else {
    countries = `Production country: ${countries}`;
  }
  // get rid or comma and space after the last country
  countries = countries.slice(0, -2);
  const htmlString = `
  <img style="display: block; float:left; margin: 10px; height: 95%" src="${imgBaseUrlLarge +
    movie.poster_path}" alt="Image poster not found" />
  <h3 style="text-align: center">${movie.name}</h3>
  <h6>Year: ${movie.year}<br>
  ${countries}<br>
  Budget: ${budget}<br>
  Runtime: ${runTime}<br>
  Average rating: ${movie.vote_average}</h6>
  <p>${movie.overview}</p>
  `;
  d3.select('#movieInfo')
    .html(htmlString)
    .style('width', `${svgWidth}px`);
} // displayMovieInfo

function drawBarChart(countryId = prevCountryId, years) {
  // if (prevCountryId && !countryId) {
  //   countryId = prevCountryId;
  // }
  prevCountryId = countryId;
  yearData = allData.filter(d => d.year >= years[0] && d.year <= years[1]);

  const countryData =
    countryId !== undefined
      ? yearData.filter(movie =>
        movie.production_countries.some(d => codeLetterToNumeric.get(d.iso_3166_1) === countryId, ), )
      : yearData;
  // console.log(countryData);

  // Count number of movies per genre for a given countryId
  let genreData = new Map();
  countryData.forEach((movie) => {
    movie.genres.forEach((genre) => {
      genreData.set(genre.name, genreData.get(genre.name) + 1 || 1);
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
  console.log(genreData);
  const barPadding = 3;
  const barWidth = Math.min(
    (svgWidth - padding * 2) / genreData.length - barPadding,
    svgWidth / 10,
  );
  // make tallest bar equal svgHeight
  // const barHeightPerOccurence =
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
    .attr('x', -svgHeight + paddingBottom * 2)
    .attr('text-anchor', 'start')
    .attr('alignment-baseline', 'middle')
    .attr('font-size', '1em')
    .attr('font-weight', '200');

  // Plot label
  // debugger;
  const countryName = codeNumericToName.has(countryId)
    ? ` filmed in ${codeNumericToName.get(countryId)}`
    : '';
  d3.select('#barChart')
    .selectAll('.plotLabel')
    .remove();
  d3.select('#barChart')
    .append('text')
    .classed('plotLabel', true)
    .text(`Number of movies${countryName} per genre`)
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

function convertArrayOfObjectsToCSV(args) {
  console.log('Entered convertArrayOfObjectsToCSV');
  let result
  let ctr

  const data = args.data || null;
  if (data == null || !data.length) {
    return null;
  }

  const columnDelimiter = args.columnDelimiter || ',';
  const lineDelimiter = args.lineDelimiter || '\n';

  const keys = Object.keys(data[0]);

  result = '';
  result += keys.join(columnDelimiter);
  result += lineDelimiter;

  data.forEach((item) => {
    ctr = 0;
    keys.forEach((key) => {
      if (ctr > 0) result += columnDelimiter;

      // if (key === "name")
      // result += `"${item[key]}"`;
      // else
      result += item[key];
      ctr += 1;
    });
    result += lineDelimiter;
  });

  return result;
}

function downloadCSV() {
  console.log('Entered downloadCSV');
  // let data;
  const csv = convertArrayOfObjectsToCSV({
    data: allData,
    columnDelimiter: '|',
  });
  if (csv == null) return;

  const filename = 'allData.dsv';

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      // feature detection, Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style = 'visibility:hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
