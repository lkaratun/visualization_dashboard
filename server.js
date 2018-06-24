let sliderLow;
let sliderHigh;
const yearsChosen = [2017, 2017];
const countriesChosen = [];

let colorScale;
let yearData;
const yearsList = new Set();
const xDataSelector = 'budget';
const yDataSelector = 'vote_average';
const rDataSelector = 'popularity';
const cDataSelector = 'runtime';
let allData;
const codeLetterToNumeric = new Map();
const codeNumericToName = new Map();
let mapData;
let countryCodes;
const imgBaseUrl = 'http://image.tmdb.org/t/p/w154/';
const imgBaseUrlLarge = 'http://image.tmdb.org/t/p/w300/';

const mongoose = require("mongoose");
const d3 = require("d3");
const csv = require("csvtojson");

init();

// module.exports = mongoose.model("Movie", movieSchema);

function populateDB(data) {

  mongoose.connect('mongodb://localhost/movies');
  // const countrySchema = new mongoose.Schema({
  //   letterCode: String,
  //   name: String
  // });
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', () => {
    const movieSchema = new mongoose.Schema({
      id: Number,
      name: String,
      year: Number,
      budget: Number,
      popularity: Number,
      runtime: Number,
      vote_average: Number,
      poster_path: String,
      production_countries: [{ letter_code: String, name: String }],
      overview: String,
      genres: [String]
    }, { collection: 'movies' });

    const yearSchema = new mongoose.Schema({
      value: Number,
      movies: [movieSchema]
    }, { collection: 'years' });

    const Year = mongoose.model("year", yearSchema, "years");
    const Movie = mongoose.model("movie", movieSchema, "movies");

    data.forEach(row => {
      const genres = JSON.parse(row.genres).map(entry => entry.name);
      const movie = new Movie({
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
        genres
      });

      movie.save((err) => { if (err) { console.log(err); } });
    });
  });


}



async function init() {
  // [mapData, countryCodes] = await Promise.all([d3.json('mapData.json'), d3.json('countryCodes.json')]);
  csv({ delimiter: "|" })
    .fromFile("allDataSm.dsv")


    // , (row) => {
    //   yearsList.add(+row.year);

    //   return {
    //     id: +row.id,
    //     name: row.name,
    //     year: +row.year,
    //     budget: +row.budget,
    //     popularity: +row.popularity,
    //     runtime: +row.runtime,
    //     vote_average: +row.vote_average,
    //     poster_path: row.poster_path,
    //     production_countries: JSON.parse(row.production_countries.replace(/'/g, '"')),
    //     overview: row.overview,
    //     genres: JSON.parse(row.genres),
    //   };
    // })
    .then(async (filteredMovies) => {
      // allData = filteredMovies;
      // console.log(filteredMovies);
      populateDB(filteredMovies);

      // const movieCount = new Map();
      // allData.forEach(d =>
      //   movieCount.set(d.year, movieCount.get(d.year) + 1 || 1));
      // // values of year slider

      // const indicesList = [];
      // yearsList.forEach((value, index) => indicesList.push(index));
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
        })
        .catch((e2) => {
          console.log(e2);
        });
    }
    );
}

function convertArrayOfObjectsToCSV(args) {
  let result;
  let ctr;

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
