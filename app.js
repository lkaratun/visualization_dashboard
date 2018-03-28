var data, filename, link;
const svgWidth = 600;
const svgHeight = 600;
const padding = 60;
const svg = d3.select("svg")
				.attr("width", svgWidth)
				.attr("height", svgHeight);
const slider = d3.select("#year");

var xData, yData, rData, cData, xScale, yScale;
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

//Retrieve all data from movies_metadata.csv and store it in allData array. Store selected year's data in yearData array
d3.queue()
		// .defer(d3.csv, "movies_metadata.csv", row => {
		// 	//Only keep rows with all keys having valid values
		// 	if (!row[xDataSelector]  || !row[yDataSelector] || !row[rDataSelector]
		// 		|| !row[cDataSelector]  || !row.release_date || !row.title) return;
		// 	yearsList.add(+row.release_date.slice(0,4));
		// 	if (+row.release_date.slice(0,4) == 22) console.log(row);
		// 	return {
		// 		id: +row.id,
		// 		name: row.title,
		// 		year: +row.release_date.slice(0,4),
		// 		budget: +row.budget,
		// 		popularity: +row.popularity,
		// 		runtime: +row.runtime,
		// 		vote_average: +row.vote_average,
		// 		poster_path: row.poster_path
		// 	}
		// })
		.defer(d3.csv, "allData.csv")
		.await((error, movies) => {
			if (error) throw error;
			allData = movies;
			allData.forEach(d => yearsList.add(d.year));
			yearsList = Array.from(yearsList).sort((a,b) => a-b);
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
			drawPlot(2017);
			// downloadCSV();
		});

function drawPlot (year) {
	yearData = allData.filter(d => d.year == year);
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
	let colorScale = d3.scaleLinear()
					.domain(d3.extent(yearData, d => d[cDataSelector]))
					.range([d3.rgb("#66ff33"), d3.rgb("#cc0000")]);
	let radiusScale = d3.scaleLinear()
					.domain(d3.extent(yearData, d => d[rDataSelector]))
					.range([3, 12]);

	svg
		.selectAll("g")
		.remove();

	svg
		.selectAll("text")
		.remove();

	svg
		.selectAll("circle")
		.data(yearData, d => d.id)
		.exit()
		.remove();

	//Draw axes
	svg
		.append("g")
		.call(xAxis)
		.attr("transform", `translate (0, ${svgHeight - padding})`);
	svg
		.append("g")
		.call(yAxis)
		.attr("transform", `translate (${padding}, 0)`);

	let points = svg
					.selectAll("circle")
					.data(yearData, d => d.id);


	//tooltips
	// let tooltip = d3.select(".tooltip");
	// svg
	// 	.selectAll("circle")
	// 	.on("mousemove", (d) => {
	// 	console.log("Mouse moved");
	// 	tooltip
	// 		.style("opacity", 1)
	// 		.text(d.country)
	// 		.style("left", d3.event.x - tooltip.node().offsetWidth/2 + "px")
	// 		.style("top", d3.event.y - 75 + "px");
	// 	})
	// 	.on("mouseout", () => tooltip.style("opacity", 0));



	// Plot label
	svg
		.append("text")
		.text(`${yLabel} vs ${xLabel} (${year})`)
		.attr("x", svgWidth / 2)
		.attr("y", padding)
		.attr("dy", "-0.5em")
		.attr("font-size", "1.2em")
		.attr("text-anchor", "middle");

	// Axes labels
	// X axis
	svg
		.append("text")
		.text(xLabel)
		.attr("x", svgWidth / 2)
		.attr("y", svgHeight - padding)
		.attr("dy", "1.5em")
		.attr("font-size", "1em")
		.attr("text-anchor", "middle");

	// Y axis
	svg
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
		.duration(1000)
		.delay((d, i) => i * 3)
			.attr("cx", d => d[xDataSelector] ? xScale(d[xDataSelector]) : padding)
			.attr("cy", d => d[yDataSelector] ? yScale(d[yDataSelector]) : svgHeight - padding)
			.attr("fill", d => d[cDataSelector] ? colorScale(d[cDataSelector]) : "#e1e1d0")
			// .attr("r", 10)
			.attr("r", d => d[rDataSelector] && d[yDataSelector] && d[xDataSelector] ? radiusScale(d[rDataSelector]) : 0)

} // DrawPlot


slider.on("input", () => {console.log(yearScale(+d3.event.target.value)); drawPlot(yearScale(+d3.event.target.value))});

function convertArrayOfObjectsToCSV(args) {
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

                result += item[key];
                ctr++;
            });
            result += lineDelimiter;
        });

        return result;
    }

function downloadCSV(args) {
        var data, filename;
        var csv = convertArrayOfObjectsToCSV({
            data: allData
        });
        if (csv == null) return;

        filename = 'export.csv';

        if (!csv.match(/^data:text\/csv/i)) {
            csv = 'data:text/csv;charset=utf-8,' + csv;
        }
        data = encodeURI(csv);
        // console.log(data);
        // console.log(csv);
        link = document.createElement('a');
        link.setAttribute('href', data);
        link.setAttribute('download', filename);
        link.click();
    }

function downloadCSV(args) {
	var data, filename, link;
	var csv = convertArrayOfObjectsToCSV({
		data: allData
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


// document.addEventListener("DOMContentLoaded", () => {
// 	let year = d3.select('#year').attr('value');
// 	drawPlot(year);
// });
