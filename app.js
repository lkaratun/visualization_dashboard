var temp;
var data, filename, link;
const svgWidth = 600;
const svgHeight = 400;
const padding = 40;
const scatterPlot = d3.select("#scatterPlot")
	.attr("width", svgWidth)
	.attr("height", svgHeight);

const slider = d3.select("#year");

var xData, yData, rData, cData, xScale, yScale, colorScale;
var year = 1995;
var yearData;
let yearsList = new Set();
let xDataSelector = "budget";
let yDataSelector = "vote_average";
let rDataSelector = "popularity";
let cDataSelector = "runtime";
let xLabel = "Movie budget";
let yLabel = "Viewer rating";
var allData;
var yearScale;
const imgBaseUrl = 'http://image.tmdb.org/t/p/w154/';
const imgBaseUrlLarge = 'http://image.tmdb.org/t/p/w300/';
var codeLetterToNumeric = new Map();
var codeNumericToName = new Map();

let genreNames = ["Animation", "Comedy", "Family", "Adventure",
	"Fantasy", "Drama", "Romance", "Action",
	"Crime", "Thriller",
	"History", "Science Fiction", "Mystery", "Horror", "War", "Foreign", "Western", "Documentary", "Music", "TV Movie"
];
let genreColors = ["rgba(0, 255, 255, 0.5)", "rgba(255, 212, 0, 0.4)", "hsla(20, 100%, 50%, 0.4)", "rgba(157, 0, 255, 0.7)",
	"rgba(255, 0, 199, 0.61)", "rgba(106, 0, 255, 0.74)", "rgba(233, 0, 255, 0.5)", "rgba(0, 127, 255, 0.8)",
	"rgba(0, 13, 204, 0.65)", "rgba(70, 42, 42, 0.9)"
];
let genreColorScale = d3.scaleOrdinal()
	.domain(genreNames)
	.range(genreColors);

let tryLoadingData = true;
loadAndDisplayData(tryLoadingData);



async function loadAndDisplayData(tryLoadingData) {
	d3.dsv("|", "allData.dsv", row => {
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
				genres: JSON.parse(row.genres)
			}
		})
		.then(async function(filteredMovies) {
			// console.log(filteredMovies);
			allData = filteredMovies;

			yearsList = Array.from(yearsList).sort((a, b) => a - b);
			let movieCount = new Map();
			allData.forEach(d => movieCount.set(d.year, (movieCount.get(d.year) + 1) || 1));
			// console.log(movieCount);
			//values of year slider

			let indicesList = [];
			yearsList.forEach((value, index) => indicesList.push(index));
			yearScale = d3.scaleOrdinal()
				.domain(indicesList)
				.range(yearsList);
			slider
				.attr("min", 0)
				.attr("max", yearsList.length - 1)
				.attr("value", yearsList.length - 1);
			console.log(allData);
			drawScatterPlot(2017);
			drawMap(2017);
			// displayMovieInfo(862);
			//124 is Canada
			drawBarChart(undefined, 2017);

		}).catch(e => {
			console.log(e);
			if (tryLoadingData) {
				tryLoadingData = false;
				// Retrieve all data from movies_metadata.csv and store it in allData array. Store selected year's data in yearData array
				d3.csv("movies_metadata.csv", row => {
						//Only keep rows with all keys having valid values
						if (row[xDataSelector] == 0 || row[yDataSelector] == 0 || row[rDataSelector] == 0 ||
							row[cDataSelector] == 0 || row.release_date == 0 || !row.title) return;
						yearsList.add(+row.release_date.slice(0, 4));
						// if (row.id == 36614) //console.log(row.overview)
						// console.log( {
						// 	id: +row.id,
						// 	name: row.title,
						// 	year: +row.release_date.slice(0,4),
						// 	budget: +row.budget,
						// 	popularity: +row.popularity,
						// 	runtime: +row.runtime,
						// 	vote_average: +row.vote_average,
						// 	poster_path: row.poster_path,
						// 	production_countries: row.production_countries,
						// 	overview: row.overview,
						// 	genres: row.genres.replace(/'/g, '"')
						// });

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
							genres: row.genres.replace(/'/g, '"')
						}
					})
					.then(response => {
						allData = response;
						downloadCSV();
						// loadAndDisplayData(tryLoadingData);
					}).catch(e => {
						console.log(e);
					});



			}
		});

}



function drawScatterPlot(year) {
	yearData = allData.filter(d => d.year == year);
	// console.log(allData);
	//Choose whether to use all data or current year's data for axes and grid scaling
	let dataForScaling = d3.select("#scaleGlobal").property("checked") ? allData : yearData;

	xScale = d3.scaleLinear()
		.domain(d3.extent(dataForScaling, d => d[xDataSelector]))
		.range([padding, svgWidth - padding]);
	yScale = d3.scaleLinear()
		.domain(d3.extent(dataForScaling, d => d[yDataSelector]))
		.range([svgHeight - padding, padding]);
	let xAxis = d3.axisBottom(xScale)
		.tickSize(-svgHeight + 2 * padding)
		.tickSizeOuter(0)
		.tickFormat(d => d3.format(".1s")(d));
	let yAxis = d3.axisLeft(yScale)
		.tickSize(-svgWidth + 2 * padding)
		.tickSizeOuter(0);
	colorScale = d3.scaleLinear()
		.domain(d3.extent(yearData, d => d[cDataSelector]))
		.range([d3.rgb("#66ff33"), d3.rgb("#cc0000")]);
	let radiusScale = d3.scaleLinear()
		.domain(d3.extent(yearData, d => d[rDataSelector]))
		.range([3, 12]);

	scatterPlot
		.selectAll("g")
		.remove();

	scatterPlot
		.selectAll("text")
		.remove();

	scatterPlot
		.selectAll("circle")
		.data(yearData) //, d => d.id)
		.exit()
		.remove();

	//Draw axes
	scatterPlot
		.append("g")
		.call(xAxis)
		.attr("transform", `translate (0, ${svgHeight - padding})`);
	scatterPlot
		.append("g")
		.call(yAxis)
		.attr("transform", `translate (${padding}, 0)`);

	let points = scatterPlot
		.selectAll("circle")
		.data(yearData); //, d => d.id);

	// Plot label
	scatterPlot
		.append("text")
			.text(`${yLabel} vs ${xLabel} (${year})`)
			.attr("x", svgWidth / 2)
			.attr("y", padding)
			.attr("dy", "-0.75em")
			.attr("font-size", "1.2em")
			.attr("text-anchor", "middle");

	// Axes labels
	// X axis
	scatterPlot
		.append("text")
			.text(xLabel)
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
			.attr("dy", "1.5em")
			.attr("font-size", "1em")
			.attr("text-anchor", "middle");

	// Data points
	points
		.enter()
		.append("circle")
			.attr("cx", d => d[xDataSelector] ? xScale(d[xDataSelector]) : padding)
			.attr("cy", d => d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding)
		.merge(points)
			// .transition()
			// .duration(300)
			// .delay((d, i) => i * 3)
			.attr("cx", d => d[xDataSelector] ? xScale(d[xDataSelector]) : padding)
			.attr("cy", d => d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding)
			// .attr("fill", d => d[cDataSelector] ? colorScale(d[cDataSelector]) : "#e1e1d0")
			.attr("fill", "#333333")
			// .attr("r", 10)
			.attr("r", d => d[rDataSelector] && d[yDataSelector] && d[xDataSelector] ? radiusScale(d[rDataSelector]) : 0);

	points
		.moveToFront();

	//tooltips
	let tooltip = d3.select(".tooltip");
	scatterPlot
		.selectAll("circle")
		.on("mousemove", (d) => {
			tooltip
				.style("opacity", 1)
				.html(`
				<b style="display: block">${d.name}</b>
				<img style="display: block" src="${imgBaseUrl + d.poster_path}" alt="" />


				`)
				.style("left", d3.event.x /*- tooltip.node().offsetWidth/2*/ + 5 + "px")
				.style("top", d3.event.y + "px");
		})
		.on("mouseout", () => tooltip.style("opacity", 0));


	//Show movie info on circle click
	scatterPlot
		.selectAll("circle")
		.on("click", d => {
			console.log(d);
			displayMovieInfo(d.id)
		});

} // DrawScatterPlot


slider.on("input", () => {
	// console.log(yearScale(+d3.event.target.value));
	d3.select("#sliderLabel").text(`Year: ${yearScale(+d3.event.target.value)}`);
	drawScatterPlot(yearScale(+d3.event.target.value));
	drawMap(yearScale(+d3.event.target.value));
});


async function drawMap(year) {
	//already did thin in drawScatterPlot
	yearData = allData.filter(d => d.year == year);

	let mapData = await d3.json('mapData.json');
	//File containing country codes, particularly letter and numeric versions
	let countryCodes = await d3.json('countryCodes.json');
	//Hashmap to convert letter country code to numeric

	countryCodes.forEach(d => {
		codeLetterToNumeric.set(d["alpha-2"], d["country-code"]);
		codeNumericToName.set(d["country-code"], d["name"]);
	});
	var geoData = topojson.feature(mapData, mapData.objects.countries).features;
	geoData.forEach(d => d.properties = {
		movies: []
	});
	// console.log(geoData);

	//Fill geoData with Movies data
	yearData.forEach(row => {
		var countries = geoData.filter(geoDataEntry => {
			for (productionCountry of row.production_countries)
				if (codeLetterToNumeric.get(productionCountry.iso_3166_1) === geoDataEntry.id)
					return true;
		});
		countries.forEach(country => country.properties.movies.push(row));
	});
	console.log(geoData);

	colorScale = d3.scaleLog()
		// Adding 1 for log scale to work correctly
		.domain(d3.extent(geoData, d => d.properties.movies.length + 1))
		.range([d3.rgb("#6da2ff"), d3.rgb("#ff6411")]);

	var projection = //d3.geoMercator()
		d3.geoNaturalEarth1().scale(120)
		.translate([svgWidth * 0.45, svgHeight * 0.5]);

	var path = d3.geoPath()
		.projection(projection);

	const worldMap = d3.select("#worldMap")
		.attr("width", svgWidth)
		.attr("height", svgHeight)
		.selectAll(".country")
		.data(geoData);

	worldMap
		// .selectAll(".country")
		// .data(geoData)
		.exit()
		.remove();

	let tooltip = d3.select(".tooltip");
	worldMap
		// .selectAll(".country")
		// .data(geoData)
		.enter()
		.append("path")
		.classed("country", true)
		.merge(worldMap)
		.attr("d", path)
		.attr("fill", d => d.properties.movies.length ? colorScale(d.properties.movies.length) : "#DDDDDD");

	//tooltips

	d3.select("#worldMap")
		.selectAll(".country")
		.on("mousemove", d => {
			tooltip
				.style("opacity", 1)
				.text(codeNumericToName.get(d.id))
				.style("left", d3.event.x - tooltip.node().offsetWidth / 2 + "px")
				.style("top", d3.event.y - 35 + "px");
		})
		.on("mouseout", () => tooltip.style("opacity", 0))
		.on("click", d => drawBarChart(d.id, year));

	// Plot label
	d3.select("#worldMap")
		.append("text")
		.text(`Number of movies per country`)
		.attr("x", svgWidth / 2)
		.attr("y", padding)
		.attr("dy", "-0.75em")
		.attr("font-size", "1.2em")
		.attr("text-anchor", "middle");


} //drawMap

function displayMovieInfo(id) {

	let [movie] = allData.filter(d => d.id == id);
	let budget = movie.budget >= 1e6 ? +(movie.budget/1e6).toFixed(2) + "M" : +(movie.budget/1e3).toFixed(2) + "K";
	let htmlString = `
	<img style="display: block; float:left; margin: 10px; height: 95%" src="${imgBaseUrlLarge + movie.poster_path}" alt="Image poster not found" />
	<h3 style="text-align: center">${movie.name} (${movie.year})</h3>
	<h4>Budget: ${budget}, runtime: ${movie.runtime}, rating: ${movie.vote_average}</h4>
	<p>${movie.overview}</p>
	`;
	d3.select("#movieInfo")
		.html(htmlString)
		.style("width", svgWidth + "px");
} //displayMovieInfo

function drawBarChart(country, year) {
	console.log(country);
	yearData = allData.filter(d => d.year == year);

	let countryData = country !== undefined ? yearData.filter(movie => movie.production_countries.some(d => codeLetterToNumeric.get(d.iso_3166_1) === country)) : yearData;
	// console.log(countryData);

	//Count number of movies per genre for a given country
	let genreData = new Map();
	countryData.forEach(movie => {
		movie.genres.forEach(genre => {
			genreData.set(genre.name, genreData.get(genre.name) + 1 || 1);
		})
	});

	let paddingBottom = 10;
	// let xScale = d3.scaleLinear()
	// 				.domain(Array.from(genreData.keys()))
	// 				.range([padding, svgWidth - 2*padding]);
	let yScale = d3.scaleLinear()
		.domain([0, d3.max(Array.from(genreData.values()))])
		.range([svgHeight, paddingBottom + padding]);
	let yAxis = d3.axisLeft(yScale)
		.tickSize(padding / 3)
		.tickFormat(e => Math.floor(e) == e ? e : undefined);
	// .tickSizeOuter(0);


	genreData = Array.from(genreData).sort((a, b) => b[1] - a[1]);
	console.log(genreData);
	let barPadding = 3;
	let barWidth = Math.min((svgWidth - padding * 2) / genreData.length - barPadding, svgWidth / 10);
	//make tallest bar equal svgHeight
	let barHeightPerOccurence = (svgHeight - 2 * padding) / d3.max(genreData, d => d[1]);


	const bars = d3.select("#barChart")
		.attr("width", svgWidth)
		.attr("height", svgHeight)
		.selectAll(".bar")
		.data(genreData, d => d[0]);

	const barLabels = d3.select("#barChart")
		.selectAll(".barLabel")
		.data(genreData, d => d[0]);

	barLabels
		.exit()
		.remove();
	bars
		.exit()
		.remove();
	d3.select("#barChart")
		.selectAll("g")
		.remove();

	//Bars
	bars
		.enter()
		.append("rect")
		.classed("bar", true)
		.merge(bars)
		.attr("x", (d, i) => padding + (barWidth + barPadding) * i)
		.attr("y", d => yScale(d[1]) - paddingBottom)
		.attr("height", d => svgHeight - yScale(d[1]))
		.attr("width", barWidth)
		.attr("fill", d => genreColorScale(d[0]));

	//Bar labels
	barLabels
		.enter()
		.append("text")
		.classed("barLabel", true)
		.merge(barLabels)
		.text(d => d[0])
		.attr("y", (d, i) => padding + (barWidth + barPadding) * i + barWidth / 2)
		.attr("x", d => -svgHeight + paddingBottom * 2)
		.attr("text-anchor", "start")
		.attr("alignment-baseline", "middle")
		.attr("font-size", "1.2em")
		.attr("font-weight", "800");

	// Plot label
	d3.select("#barChart")
		.append("text")
		.text(`Number of movies per genre`)
		.attr("x", svgWidth / 2)
		.attr("y", padding)
		.attr("dy", "-0.75em")
		.attr("font-size", "1.2em")
		.attr("text-anchor", "middle");
	// .attr("alignment-baseline", "mathematical");


	// Left axis
	d3.select("#barChart")
		.append("g")
		.call(yAxis)
		.attr("transform", `translate (${padding}, ${-paddingBottom})`);

} //drawBarChart


function convertArrayOfObjectsToCSV(args) {
	console.log("Entered convertArrayOfObjectsToCSV");
	var result, ctr, keys, columnDelimiter, lineDelimiter, data;

	data = args.data || null;
	if (data == null || !data.length) {
		return null;
	}

	columnDelimiter = args.columnDelimiter || ',';
	lineDelimiter = args.lineDelimiter || '\n';

	keys = Object.keys(data[0]);

	result = '';
	result += keys.join(columnDelimiter);
	result += lineDelimiter;

	data.forEach(function(item) {
		ctr = 0;
		keys.forEach(function(key) {
			if (ctr > 0) result += columnDelimiter;

			// if (key === "name")
			// result += `"${item[key]}"`;
			// else
			result += item[key];
			ctr++;
		});
		result += lineDelimiter;
	});

	return result;
}

function downloadCSV(args) {
	console.log("Entered downloadCSV");
	var data, filename, link;
	var csv = convertArrayOfObjectsToCSV({
		data: allData,
		columnDelimiter: "|"
	});
	if (csv == null)
		return;

	filename = 'allData.dsv';

	var blob = new Blob([csv], {
		type: "text/csv;charset=utf-8;"
	});

	if (navigator.msSaveBlob) { // IE 10+
		navigator.msSaveBlob(blob, filename)
	} else {
		var link = document.createElement("a");
		if (link.download !== undefined) {

			// feature detection, Browsers that support HTML5 download attribute
			var url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", filename);
			link.style = "visibility:hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}
}
