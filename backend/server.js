// const to = require("await-to-js");
// import to from 'await-to-js';
function to(promise) {
  return promise.then(data => [null, data])
    .catch(err => [err]);
}

const mongoose = require("mongoose");
const csvtojson = require("csvtojson");
const express = require("express");
const fs = require('fs');

const app = express();
const router = express.Router();
app.use("", router);
app.listen(3000, () => console.log("App is running on port 3000"));


// let test = d3.csvParse("adult,belongs_to_collection\n
//   False, "{'id': 10194, 'name': 'Toy Story Collection', 'poster_path': '/7G9915LfUQ2lVfwMEEhDsn3kT4B.jpg', 'backdrop_path': '/9FBwqcd9IRruEDUrTdcaafOMKUq.jpg'}", 30000000, "[{'id': 16, 'name': 'Animation'}, {'id': 35, 'name': 'Comedy'}, {'id': 10751, 'name': 'Family'}]", http://toystory.disney.com/toy-story,862,tt0114709,en,Toy Story,"Led by Woody, Andy's toys live happily in his room until Andy's birthday brings Buzz Lightyear onto the scene. Afraid of losing his place in Andy's heart, Woody plots against Buzz. But when circumstances separate Buzz and Woody from their owner, the duo eventually learns to put aside their differences.",21.946943,/rhIRbceoE9lR4veEXuwCC2wARtG.jpg,"[{'name': 'Pixar Animation Studios', 'id': 3}]","[{'iso_3166_1': 'US', 'name': 'United States of America'}]",1995-10-30,373554033,81.0,"[{'iso_639_1': 'en', 'name': 'English'}]",Released,,Toy Story,False,7.7,5415)

router.get("/populate/:fileName", async (req, res) => {
  try {
    await populateDBFromFile(req.params.fileName);
    const movies = await readTopNMoviesFromDB(20);
    res.json(movies);
  }
  catch (e) { console.log(e); }
});

router.get("/convert/:fileName", async (req, res) => {
  try {
    const err = await convertCsvToDsv(req.params.fileName);
    if (err) { res.send(err); }
    else { res.send("Success!"); };
  }
  catch (e) { console.log(e); }
});

router.get("/", async (req, res) => {
  try {
    const movies = await readTopNMoviesFromDB(20);
    res.json(movies);
  }
  catch (e) { console.log(e); }
});


const Movie = createMovieModel();



function setUpDBConnection() {
  mongoose.connect('mongodb://localhost/moviesDB');
  mongoose.Promise = global.Promise;
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error: '));
}

function createMovieModel() {
  setUpDBConnection();
  // adult|collection|budget|genres|homepage|id|imdbId|originalLanguage|originalTitle|overview|popularity|posterPath|productionCompanies
  // |productionCountries|releaseDate|revenue|runtime|spokenLanguages|status|tagline|title|video|voteAverage|voteCount
  const movieSchema = new mongoose.Schema({
    _id: String,
    adult: Boolean,
    collections: String,
    budget: Number,
    genres: [String],
    homepage: String,
    id: Number,
    originalTitle: String,
    originalLanguage: String,
    overview: String,
    popularity: Number,
    posterPath: String,
    productionCompanies: [String],
    productionCountries: [{ letterCode: String, name: String }],
    releaseDate: Date,
    revenue: Number,
    runtime: Number,
    spokenLanguages: [String],
    status: String,
    tagline: String,
    title: String,
    video: String,
    voteAverage: Number,
    voteCount: Number
  }, { collection: 'movies' });
  return mongoose.model("movie", movieSchema, "moviesFull");
}

async function convertCsvToDsv(fileName) {
  const newFileName = `${fileName.slice(0, fileName.length - 4)}.dsv`; // replace extension (must be 3 chars long) with dsv
  // Don't overwrite existing file
  if (fs.existsSync(newFileName)) { console.log("DSV file already exists!"); return null; };

  const [err, movies] = await to(csvtojson({ delimiter: "," }).fromFile(fileName));
  if (err) { console.log(err); return err; }
  const dsvString = convertArrayOfObjectsToString(movies,
    { columnDelimiter: '|' });
  if (dsvString == null) return "File read error";


  fs.writeFile(newFileName, dsvString, (fileWriteErr) => {
    if (fileWriteErr) {
      return fileWriteErr;
    }
    console.log("The file was saved!");
    return null;
  });
  return null;

}



async function populateDBFromFile(fileName) {
  // [mapData, countryCodes] = await Promise.all([d3.json('mapData.json'), d3.json('countryCodes.json')]);

  const [err, movies] = await to(csvtojson({ delimiter: "|", quote: "off" }).fromFile(fileName));
  if (err) { console.log(err); return; }

  // console.log(movies);

  movies.forEach(row => {
    const movie = parseMovieRow(row);

    try {
      movie.save((dbErr) => {
        if (dbErr) {
          if (dbErr.code !== 11000) {
            console.log(dbErr);
            console.log(movie);
          }
        }
      });
    }
    catch (e) { console.log(e); console.log(movie); }
  });
  console.log("Population complete!");

}

function parseMovieRow(row) {
  const {
    homepage, originalLanguage, originalTitle,
    title, overview, posterPath,
    revenue, status, tagline
  } = row;

  try {
    const compoundPropertiesList = ["genres", "spokenLanguages"];
    const compoundProperties = replacePropertiesWithNames(row, compoundPropertiesList);
    let { collections } = row;
    if (typeof collections === "object") { collections = collections.name; }
    const releaseDate = new Date(row.releaseDate) || null;
    const movieData = {
      _id: row.imdbId,
      id: +row.id || null,

      budget: +row.budget || null,
      popularity: +row.popularity || null,
      runtime: +row.runtime || null,
      voteAverage: +row.vote_average || null,
      voteCount: +row.vote_count || null,
      adult: row.adult.toLowerCase() || null,
      // Lots of double quotes around studio names
      // productionCountries: JSON.parse(row.productionCountries) || null, 
      collections, homepage, originalLanguage, originalTitle,
      title, overview, posterPath,
      revenue, status, tagline,
      ...compoundProperties
    };

    if (releaseDate) { movieData.releaseDate = releaseDate; }
    return new Movie(movieData);
  }
  catch (e) { return e; }
}

function replacePropertiesWithNames(line, properties) {
  const res = {};
  properties.forEach(property => {
    try {
      const arr = JSON.parse(line[property]);
      if (Array.isArray(arr)) { res[property] = arr.map(entry => entry.name); }
      else { res[property] = arr; }
    }
    catch (e) { console.log(e); console.log(line); console.log(property); }
  });
  return res;
}

function convertArrayOfObjectsToString(data, args) {
  let result;
  let firstValueOnLine;

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
    firstValueOnLine = true;
    keys.forEach((key) => {
      if (!firstValueOnLine) result += columnDelimiter;
      result += item[key];
      firstValueOnLine = false;
    });
    result += lineDelimiter;
  });

  return result;
}

function readTopNMoviesFromDB(movieCount) {
  return Movie.find().limit(movieCount);
}

async function generateDataFile(fileName) {
  const csv = convertArrayOfObjectsToString({
    // data,
    columnDelimiter: '|'
  });
  if (csv == null) return;


  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, fileName);
  } else {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      // feature detection, Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style = 'visibility:hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }




}


// const compoundPropertiesListTemp = ["collections", "genres", "productionCompanies", "productionCountries", "spokenLanguages"];
// const rowTemp = 'False|{"id": 10194, "name": "Toy Story Collection", "poster_path": " / 7G9915LfUQ2lVfwMEEhDsn3kT4B.jpg", "backdrop_path": " / 9FBwqcd9IRruEDUrTdcaafOMKUq.jpg"}|30000000|[{"id": 16, "name": "Animation"}, {"id": 35, "name": "Comedy"}, {"id": 10751, "name": "Family"}]|http://toystory.disney.com/toy-story|862|tt0114709|en|Toy Story|Led by Woody, Andys toys live happily in his room until Andys birthday brings Buzz Lightyear onto the scene. Afraid of losing his place in Andys heart, Woody plots against Buzz.But when circumstances separate Buzz and Woody from their owner, the duo eventually learns to put aside their differences.| 21.946943 | /rhIRbceoE9lR4veEXuwCC2wARtG.jpg|[{"name": "Pixar Animation Studios", "id": 3}]|[{"iso_3166_1": "US", "name": "United States of America"}]|1995-10-30|373554033|81.0|[{"iso_639_1": "en", "name": "English"}]|Released||Toy Story|False|7.7|5415';
// console.log(replacePropertiesWithNames(rowTemp, compoundPropertiesListTemp));