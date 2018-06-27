// const yearsList = new Set();
// const xDataSelector = 'budget';
// const yDataSelector = 'vote_average';
// const rDataSelector = 'popularity';
// const cDataSelector = 'runtime';
// let allData;
// const codeLetterToNumeric = new Map();
// const codeNumericToName = new Map();
// let mapData;
// let countryCodes;

const mongoose = require("mongoose");
// const d3 = require("d3");
const csvtojson = require("csvtojson");
const express = require("express");

const app = express();
const router = express.Router();
app.use("", router);
app.listen(3000, () => console.log("App is running on port 3000"));

router.get("/populate", async (req, res) => {
  try {
    await fileToDb("allData.dsv");
    const movies = await listMovies();
    // console.log(movies);
    res.json(movies);
  }
  catch (e) { console.log(e); }
});

router.get("/", async (req, res) => {
  try {
    const movies = await listMovies();
    // console.log(movies);
    res.json(movies);
  }
  catch (e) { console.log(e); }
});

const Movie = init();

function listMovies() {
  return Movie.find().limit(20);
}

function init() {
  mongoose.connect('mongodb://localhost/moviesDB');
  mongoose.Promise = global.Promise;
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error: '));
  // const countrySchema = new mongoose.Schema({
  //   letterCode: String,
  //   name: String
  // });
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
  return mongoose.model("movie", movieSchema, "movies");
}

function populateDB(data) {
  // const countrySchema = new mongoose.Schema({
  //   letterCode: String,
  //   name: String
  // });

  // const movieSchema = new mongoose.Schema({
  //   id: Number,
  //   name: String,
  //   year: Number,
  //   budget: Number,
  //   popularity: Number,
  //   runtime: Number,
  //   vote_average: Number,
  //   poster_path: String,
  //   production_countries: [{ letter_code: String, name: String }],
  //   overview: String,
  //   genres: [String]
  // }, { collection: 'movies' });

  // // const yearSchema = new mongoose.Schema({
  // //   value: Number,
  // //   movies: [movieSchema]
  // // }, { collection: 'years' });

  // // const Year = mongoose.model("year", yearSchema, "years");
  // Movie = mongoose.model("movie", movieSchema, "movies");

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
}

function fileToDb(filename) {
  // [mapData, countryCodes] = await Promise.all([d3.json('mapData.json'), d3.json('countryCodes.json')]);
  csvtojson({ delimiter: "|" })
    .fromFile(filename)
    .then(async (filteredMovies) => {
      populateDB(filteredMovies);
    })
    .catch((e) => {
      console.log(e);
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

// function downloadCSV() {
//   // let data;
//   const csv = convertArrayOfObjectsToCSV({
//     data: allData,
//     columnDelimiter: '|',
//   });
//   if (csv == null) return;

//   const filename = 'allData.dsv';

//   const blob = new Blob([csv], {
//     type: 'text/csv;charset=utf-8;',
//   });

//   if (navigator.msSaveBlob) {
//     // IE 10+
//     navigator.msSaveBlob(blob, filename);
//   } else {
//     const link = document.createElement('a');
//     if (link.download !== undefined) {
//       // feature detection, Browsers that support HTML5 download attribute
//       const url = URL.createObjectURL(blob);
//       link.setAttribute('href', url);
//       link.setAttribute('download', filename);
//       link.style = 'visibility:hidden';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//     }
//   }
// }
