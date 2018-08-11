// const to = require("await-to-js");
// import to from 'await-to-js';
const { MongoClient } = require('mongodb');


const mongoose = require("mongoose");
const csvtojson = require("csvtojson");
const express = require("express");
const fs = require('fs');
const cors = require("cors");
const https = require('https');

const app = express();
app.use(cors({
  origin: ['http://localhost:1234', 'https://localhost:1234', 'http://levkaratun.com:1234', 'https://levkaratun.com']
}));
const router = express.Router();
app.use("", router);
// if (process.env.NODE_ENV !== 'test') {
//   app.listen(3000, () => console.log("App is running on port 3000"));
// }
https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app)
  .listen(3000, () => console.log('Server is listening to https requests on port 3000'));

// const Movie = function createMovieModel() {
//   setUpDBConnection();
//   // adult|collection|budget|genres|homepage|id|imdbId|originalLanguage|originalTitle|overview|popularity|posterPath|productionCompanies
//   // |productionCountries|releaseDate|revenue|runtime|spokenLanguages|status|tagline|title|video|voteAverage|voteCount
//   const movieSchema = new mongoose.Schema({
//     _id: String,
//     adult: Boolean,
//     collections: String,
//     budget: Number,
//     genres: [String],
//     homepage: String,
//     id: Number,
//     originalTitle: String,
//     originalLanguage: String,
//     overview: String,
//     popularity: Number,
//     posterPath: String,
//     productionCountries: [{ letterCode: String, name: String }],
//     releaseDate: Date,
//     releaseYear: String,
//     revenue: Number,
//     runtime: Number,
//     spokenLanguages: [String],
//     status: String,
//     tagline: String,
//     title: String,
//     video: String,
//     voteAverage: Number,
//     voteCount: Number
//   });
//   return mongoose.model("Movie", movieSchema, "movies");
// }();

// mongoose
// function setUpDBConnection() {
//   // mongoose.connect('mongodb://localhost/moviesDB');
//   // mongoose.connect('mongodb://nodejs:eELPHv5WuDQS@localhost/moviesDB');
//   mongoose.connect('mongodb://nodejs:eELPHv5WuDQS@levkaratun.com/moviesDB');
//   mongoose.Promise = global.Promise;
//   const db = mongoose.connection;
//   db.on('error', console.error.bind(console, 'connection error: '));
// }




router.get("/populate/:fileName", async (req, res) => {
  try {
    await populateDBFromFile(req.params.fileName);
    const movies = await readTopNMoviesFromDB(20);
    res.json(movies);
  }
  catch (e) { console.log(e); }
});

router.get("/update/:parameter/:fileName", async (req, res) => {
  try {
    await updateDBFromFile(req.params.fileName, req.params.parameter);
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

router.get("/getMoviesByYear/:startYear-:endYear", async (req, res) => {
  try {
    // res.send(req.params);
    const [err, movies] = await to(findMoviesInYearsRange(req.params.startYear, req.params.endYear));
    if (err) {
      console.error(err);
      res.send(err);
    }
    else {
      // console.log("Success");
      res.send(movies);
    };
  }
  catch (e) { console.log(e); }
});

router.get("/years", async (req, res) => {
  try {
    const years = await listDistinctYears();
    // console.log(years.length);
    res.json(years);
  }
  catch (e) { console.error(e); }
});

router.get("/", async (req, res) => {
  try {
    const movies = readTopNMoviesFromDB(20);
    // console.log(movies[0].releaseDate.getFullYear());

    res.json(movies);
  }
  catch (e) { console.log(e); }
});

// mongoose
// async function listDistinctYears() {
//   const years = await Movie.distinct("releaseYear");
//   return years.filter(year => year != null).sort((a, b) => a - b);
// }

// raw mongoDB driver
function setUpDBConnection() {

  const dbUrl = 'mongodb://nodejs:eELPHv5WuDQS@localhost:27017/moviesDB';
  return MongoClient.connect(dbUrl);
}

// raw mongoDB driver
async function listDistinctYears() {
  return setUpDBConnection().then(client =>
    client.db("moviesDB").collection('movies_v2')
      .distinct("releaseYear", {})
      .then(years => years.filter(year => year != null).sort((a, b) => a - b))
  );
}


function findMoviesInYearsRange(startYear, endYear) {
  const startDate = new Date(`${startYear}-01-01`);
  const endDate = new Date(`${endYear}-12-31`);
  const query = { releaseDate: { "$gte": startDate, "$lte": endDate } };
  return Movie.find(query).lean(true);
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
  // const [mapData, countryCodes] = await Promise.all([d3.json('mapData.json'), d3.json('countryCodes.json')]);

  const movies = readFileContents(fileName);

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
    catch (e) {
      console.log(e);
      console.log(movie);
    }
  });
  console.log("Population complete!");

}

async function readFileContents(fileName) {
  const [err, movies] = await to(csvtojson({ delimiter: "|", quote: "off" }).fromFile(fileName));
  if (err) {
    console.error(err);
    return null;
  }
  return movies;
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
    const releaseDate = row.releaseDate ? new Date(row.releaseDate) : undefined;
    const releaseYear = row.releaseDate ? new Date(row.releaseDate.slice(0, 4)) : undefined;
    // Preserve date in UTC time zone 
    if (releaseDate) { releaseDate.setUTCHours(12); }


    const movieData = {
      _id: row.imdbId,
      id: +row.id || undefined,
      budget: +row.budget || undefined,
      popularity: +row.popularity || undefined,
      runtime: +row.runtime || undefined,
      voteAverage: +row.voteAverage || undefined,
      voteCount: +row.voteCount || undefined,
      adult: row.adult.toLowerCase() || undefined,
      releaseDate, releaseYear, collections, homepage, originalLanguage, originalTitle,
      title, overview, posterPath, revenue, status, tagline,
      ...compoundProperties
    };

    Object.keys(movieData).forEach(key => {
      if ((movieData[key] === "" || movieData[key] === undefined) && key !== "_id") { delete movieData[key]; }
    });

    return new Movie(movieData);
  }
  catch (e) { return e; }
}

async function updateDBFromFile(fileName, parameter) {
  const movies = await readFileContents(fileName);
  movies.forEach(row => {
    const document = { $set: {} };
    try {
      const newValue = row[parameter] ? JSON.parse(row[parameter]) : undefined;
      document.$set[parameter] = newValue;

    }
    catch (e) { console.error(e); console.log(row); }

    // console.log(document);
    try {
      Movie.updateMany({ _id: row.imdbId }, document, (dbErr) => {
        if (dbErr) {
          console.error(dbErr);
          console.log(row.imdbId);
        }
      });
    }
    catch (e) {
      console.error(e);
      console.log(row.imdbId);
    }
  });
  console.log("Update complete!");


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
  const result = Movie.find().limit(movieCount);
  return result;
}

function to(promise) {
  return promise.then(data => [null, data])
    .catch(err => [err]);
}



module.exports = { listDistinctYears };
