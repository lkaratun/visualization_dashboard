
var data, filename, link;
const svgWidth = 800;
const svgHeight = 600;
const padding = 60;
const scatterPlot = d3.select("#scatterPlot")
				.attr("width", svgWidth)
				.attr("height", svgHeight);
const worldMap = d3.select("#worldMap")
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


// // Retrieve all data from movies_metadata.csv and store it in allData array. Store selected year's data in yearData array
// d3.csv("movies_metadata.csv", row => {
// 			//Only keep rows with all keys having valid values
// 			if (row[xDataSelector] == 0  || row[yDataSelector] == 0 || row[rDataSelector] == 0
// 				|| row[cDataSelector] == 0 || row.release_date  == 0|| !row.title) return;
// 			yearsList.add(+row.release_date.slice(0,4));
// 			return {
// 				id: +row.id,
// 				name: row.title,
// 				year: +row.release_date.slice(0,4),
// 				budget: +row.budget,
// 				popularity: +row.popularity,
// 				runtime: +row.runtime,
// 				vote_average: +row.vote_average,
// 				poster_path: row.poster_path,
// 				production_countries: row.production_countries
// 			}
// 		})
// 	.then(response => {
// 			allData = response;
// 			downloadCSV();
// }).catch(e => {
//     console.log(e);
// });


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
				production_countries: JSON.parse(row.production_countries.replace(/'/g, '"'))
			}})
	.then(response => {
			allData = response;
			yearsList = Array.from(yearsList).sort((a,b) => a-b);
			let movieCount = new Map();
			allData.forEach(d => movieCount.set(d.year, (movieCount.get(d.year) + 1) || 1));
			console.log(movieCount);
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
			drawScatterPlot(2017);
			drawMap();
}).catch(e => {
    console.log(e);
});





function drawScatterPlot (year) {
	yearData = allData.filter(d => d.year == year);
	//Choose whether to use all data or current year's data for axes and grid scaling
	let dataForScaling = d3.select("#scaleToCurrentYear").property("checked") ? yearData : allData;

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
		.data(yearData, d => d.id)
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
					.data(yearData, d => d.id);

	// Plot label
	scatterPlot
		.append("text")
		.text(`${yLabel} vs ${xLabel} (${year})`)
		.attr("x", svgWidth / 2)
		.attr("y", padding)
		.attr("dy", "-0.5em")
		.attr("font-size", "1.2em")
		.attr("text-anchor", "middle");

	// Axes labels
	// X axis
	scatterPlot
		.append("text")
		.text(xLabel)
		.attr("x", svgWidth / 2)
		.attr("y", svgHeight - padding)
		.attr("dy", "1.5em")
		.attr("font-size", "1em")
		.attr("text-anchor", "middle");

	// Y axis
	scatterPlot
		.append("text")
		.text(yLabel)
		.attr("transform", "rotate(-90)")
		.attr("x", -svgHeight / 2)
		.attr("y", 0)
		.attr("dy", "2em")
		.attr("font-size", "1em")
		.attr("text-anchor", "middle");

	// Data points
	points
		.enter()
		.append("circle")
			.attr("cx", d => d[xDataSelector] ? xScale(d[xDataSelector]) : padding)
			.attr("cy", d => d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding)
		.merge(points)
		.transition()
		.duration(300)
		// .delay((d, i) => i * 3)
			.attr("cx", d => d[xDataSelector] ? xScale(d[xDataSelector]) : padding)
			.attr("cy", d => d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding)
			// .attr("fill", d => d[cDataSelector] ? colorScale(d[cDataSelector]) : "#e1e1d0")
			.attr("fill", "#333333")
			// .attr("r", 10)
			.attr("r", d => d[rDataSelector] && d[yDataSelector] && d[xDataSelector] ? radiusScale(d[rDataSelector]) : 0)

	let imgBaseUrl = 'http://image.tmdb.org/t/p/w154/';
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

} // DrawScatterPlot


slider.on("input", () => {console.log(yearScale(+d3.event.target.value)); drawScatterPlot(yearScale(+d3.event.target.value))});


async function drawMap() {
	let mapData = await d3.json('mapData.json');
	//File containing country codes, particularly letter and numeric versions
	let countryCodes = await d3.json('countryCodes.json');
	//Hashmap to convert letter country code to numeric
	let codeLetterToNumeric = new Map();
	let codeNumericToName = new Map();
	countryCodes.forEach(d => {
		codeLetterToNumeric.set(d["alpha-2"], d["country-code"]);
		codeNumericToName.set(d["country-code"], d["name"]);
	});
	console.log(codeLetterToNumeric);
	console.log(mapData);
	var geoData = topojson.feature(mapData, mapData.objects.countries).features;
	geoData.forEach(d => d.properties = {movies: []});
	// console.log(geoData);

	//Fill geoData with Movies data
	allData.forEach(row => {
      var countries = geoData.filter(geoDataEntry => {
      	for (productionCountry of row.production_countries)
      		if (codeLetterToNumeric.get(productionCountry.iso_3166_1) === geoDataEntry.id)
      			return true;
      });
      countries.forEach(country => country.properties.movies.push(row));
    });
    console.log(geoData);

    yearData = allData.filter(d => d.year == year);



	// let colorScale = d3.scaleLinear()
	// 				.domain(d3.extent(geoData, d => d.properties.movies.length))
	// 				.range([d3.rgb("#66ff33"), d3.rgb("#cc0000")]);
	colorScale = d3.scaleLog()
					// Adding 1 for log scale to work correctly
					.domain(d3.extent(geoData, d => d.properties.movies.length+1))
					.range([d3.rgb("#66ff33"), d3.rgb("#cc0000")]);
	// console.log(colorScale);

    var projection = //d3.geoMercator()
                       d3.geoNaturalEarth1().scale(120)
                       .translate([svgWidth * 0.35, svgHeight * 0.4]);

    var path = d3.geoPath()
                 .projection(projection);

    worldMap
      .selectAll(".country")
      .data(geoData)
      .enter()
        .append("path")
        .classed("country", true)
        .attr("d", path)
        .attr("fill", d => d.properties.movies.length ? colorScale(d.properties.movies.length) : "#DDDDDD");

	//tooltips
	let tooltip = d3.select(".tooltip");
	worldMap
		.selectAll("path")
		.on("mousemove", (d) => {
		tooltip
			.style("opacity", 1)
			.text(codeNumericToName.get(d.id))
			.style("left", d3.event.x - tooltip.node().offsetWidth/2 + "px")
			.style("top", d3.event.y - 35 + "px");
		})
		.on("mouseout", () => tooltip.style("opacity", 0));



} //drawMap



// document.addEventListener("DOMContentLoaded", () => {
// 	let year = d3.select('#year').attr('value');
// 	drawScatterPlot(year);
// });



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

	filename = 'YourFileNameHere.csv';

	var blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});

	if (navigator.msSaveBlob)
	{ // IE 10+
		navigator.msSaveBlob(blob, filename)
	}
	else
	{
		var link = document.createElement("a");
		if (link.download !== undefined)
	{

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
