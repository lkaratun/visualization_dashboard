const { MongoClient } = require('mongodb');
require('dotenv').load();
const compression = require('compression');
const csvtojson = require("csvtojson");
const express = require("express");
const fs = require('fs');
const cors = require("cors");
const https = require('https');

const app = express();
app.use(cors({
  origin: ['http://localhost:1234', 'https://localhost:1234', 'http://levkaratun.com:1234', 'https://levkaratun.com'],
  credentials: true
}));
const router = express.Router();
app.use("", router);
app.use(compression());


const { keyPath, certPath } = process.env;
https.createServer({
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
}, app)
  .listen(3000, () => console.log('Server is listening to https requests on port 3000'));





// router.get("/populate/:fileName", async (req, res) => {
//   try {
//     await populateDBFromFile(req.params.fileName);
//     const movies = await readTopNMoviesFromDB(20);
//     res.json(movies);
//   }
//   catch (e) { console.log(e); }
// });

// router.get("/update/:parameter/:fileName", async (req, res) => {
//   try {
//     await updateDBFromFile(req.params.fileName, req.params.parameter);
//     const movies = await readTopNMoviesFromDB(20);
//     res.json(movies);
//   }
//   catch (e) { console.log(e); }
// });

router.get("/convert/:fileName", async (req, res) => {
  try {
    const err = await convertCsvToDsv(req.params.fileName);
    if (err) { res.send(err); }
    else { res.send("Success!"); };
  }
  catch (e) { console.log(e); }
});

router.get("/getScatterPlotData/:countries/:genres/:startYear-:endYear", async (req, res) => {
  try {
    const [err, movies] = await to(findMovies({
      countries: JSON.parse(req.params.countries),
      genres: JSON.parse(req.params.genres),
      years: [req.params.startYear, req.params.endYear]
    }));
    if (err) {
      console.error(err);
      res.send(err);
    }
    else {
      res.send(movies);
    };
  }
  catch (e) { console.log(e); }
});

router.get("/getBarChartData/:countries/:startYear-:endYear", async (req, res) => {
  try {
    const [err, movies] = await to(countMoviesPerGenre({
      countries: JSON.parse(req.params.countries),
      years: [req.params.startYear, req.params.endYear]
    }));
    if (err) {
      console.error(err);
      res.send(err);
    }
    else {
      res.send(movies);
    };
  }
  catch (e) { console.log(e); }
});

router.get("/getMapData/:genres/:startYear-:endYear", async (req, res) => {
  try {
    const [err, movieCounts] = await to(countMoviesPerCountry({
      genres: JSON.parse(req.params.genres),
      years: [req.params.startYear, req.params.endYear]
    }));
    if (err) {
      console.error(err);
      res.send(err);
    }
    else {
      res.send(movieCounts);
    };
  }
  catch (e) { console.log(e); }
});

router.get("/getMovieById/:id", async (req, res) => {
  try {
    const [err, movie] = await to(findMovieById(+req.params.id));
    if (err) {
      console.error(err);
      res.send(err);
    }
    else {
      res.send(movie);
    };
  }
  catch (e) { console.log(e); }
});

router.get("/years", async (req, res) => {
  try {
    const years = await listDistinctYears();
    res.json(years);
  }
  catch (e) { console.error(e); }
});

router.get("/", async (req, res) => {
  try {
    const movies = await readTopNMoviesFromDB(20);
    res.json(movies);
  }
  catch (e) { console.log(e); }
});




// raw mongoDB driver
const moviesCollectionPromise = (function setUpDBConnection() {
  console.log(process.env.dbUserName);
  const dbUrl = `mongodb://${process.env.dbUserName}:${process.env.dbPassword}@localhost:27017/moviesDB`;
  return MongoClient.connect(dbUrl).then(client => client.db("moviesDB").collection('movies'))
    .catch(err => console.log(err));
})();

// raw mongoDB driver
async function listDistinctYears() {
  const moviesCollection = await moviesCollectionPromise;
  const years = await moviesCollection.distinct("releaseYear", {});
  return years.filter(year => year != null).sort((a, b) => a - b);
}

async function findMovies({ countries, genres, years }) {
  const [startYear, endYear] = years;
  const startDate = new Date(`${startYear}-01-01`);
  const endDate = new Date(`${endYear}-12-31`);
  const query = {
    releaseDate: { "$gte": startDate, "$lte": endDate },
    budget: { $exists: true },
    voteAverage: { $exists: true },
    popularity: { $exists: true }
  };
  if (countries !== null) query["productionCountries.letterCode"] = { "$in": countries };
  if (genres !== null) query.genres = { "$in": genres };
  const projection = {
    _id: 0, voteAverage: 1, budget: 1,
    popularity: 1, title: 1, posterPath: 1, id: 1
  };
  const moviesCollection = await moviesCollectionPromise;
  return moviesCollection.find(query, { projection }).toArray();
}

async function countMoviesPerGenre({ countries, years }) {
  const [startYear, endYear] = years;
  const startDate = new Date(`${startYear}-01-01`);
  const endDate = new Date(`${endYear}-12-31`);
  const match = {
    "$match": {
      releaseDate: { "$gte": startDate, "$lte": endDate },
      genres: { $exists: true }
    }
  };
  if (countries !== null) { match.$match["productionCountries.letterCode"] = { $in: countries }; };
  const project = { $project: { _id: 0, genres: 1 } };
  const unwind = { $unwind: "$genres" };
  const group = { "$group": { _id: "$genres", count: { $sum: 1 } } };
  const moviesCollection = await moviesCollectionPromise;
  return moviesCollection.aggregate([match, project, unwind, group]).toArray();
}

async function countMoviesPerCountry({ genres, years }) {
  const [startYear, endYear] = years;
  const startDate = new Date(`${startYear}-01-01`);
  const endDate = new Date(`${endYear}-12-31`);
  const match = {
    "$match": {
      releaseDate: { "$gte": startDate, "$lte": endDate }
    }
  };
  if (genres !== null) { match.$match.genres = { $in: genres }; };
  const project = { $project: { _id: 0, productionCountries: 1 } };
  const unwind = { $unwind: "$productionCountries" };
  const group = { "$group": { _id: "$productionCountries.letterCode", count: { $sum: 1 } } };
  const moviesCollection = await moviesCollectionPromise;
  return moviesCollection.aggregate([match, project, unwind, group]).toArray();
}

async function findMovieById(id) {
  const query = { id };
  const moviesCollection = await moviesCollectionPromise;
  return moviesCollection.findOne(query);
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



// async function populateDBFromFile(fileName) {
//   // const [mapData, countryCodes] = await Promise.all([d3.json('mapData.json'), d3.json('countryCodes.json')]);

//   const movies = readFileContents(fileName);

//   movies.forEach(row => {
//     const movie = parseMovieRow(row);

//     try {
//       movie.save((dbErr) => {
//         if (dbErr) {
//           if (dbErr.code !== 11000) {
//             console.log(dbErr);
//             console.log(movie);
//           }
//         }
//       });
//     }
//     catch (e) {
//       console.log(e);
//       console.log(movie);
//     }
//   });
//   console.log("Population complete!");

// }

// async function readFileContents(fileName) {
//   const [err, movies] = await to(csvtojson({ delimiter: "|", quote: "off" }).fromFile(fileName));
//   if (err) {
//     console.error(err);
//     return null;
//   }
//   return movies;
// }

// function parseMovieRow(row) {
//   const {
//     homepage, originalLanguage, originalTitle,
//     title, overview, posterPath,
//     revenue, status, tagline
//   } = row;

//   try {
//     const compoundPropertiesList = ["genres", "spokenLanguages"];
//     const compoundProperties = replacePropertiesWithNames(row, compoundPropertiesList);
//     let { collections } = row;
//     if (typeof collections === "object") { collections = collections.name; }
//     const releaseDate = row.releaseDate ? new Date(row.releaseDate) : undefined;
//     const releaseYear = row.releaseDate ? new Date(row.releaseDate.slice(0, 4)) : undefined;
//     // Preserve date in UTC time zone 
//     if (releaseDate) { releaseDate.setUTCHours(12); }


//     const movieData = {
//       _id: row.imdbId,
//       id: +row.id || undefined,
//       budget: +row.budget || undefined,
//       popularity: +row.popularity || undefined,
//       runtime: +row.runtime || undefined,
//       voteAverage: +row.voteAverage || undefined,
//       voteCount: +row.voteCount || undefined,
//       adult: row.adult.toLowerCase() || undefined,
//       releaseDate, releaseYear, collections, homepage, originalLanguage, originalTitle,
//       title, overview, posterPath, revenue, status, tagline,
//       ...compoundProperties
//     };

//     Object.keys(movieData).forEach(key => {
//       if ((movieData[key] === "" || movieData[key] === undefined) && key !== "_id") { delete movieData[key]; }
//     });

//     return new Movie(movieData);
//   }
//   catch (e) { return e; }
// }

// async function updateDBFromFile(fileName, parameter) {
//   const movies = await readFileContents(fileName);
//   movies.forEach(row => {
//     const document = { $set: {} };
//     try {
//       const newValue = row[parameter] ? JSON.parse(row[parameter]) : undefined;
//       document.$set[parameter] = newValue;

//     }
//     catch (e) { console.error(e); console.log(row); }

//     // console.log(document);
//     try {
//       Movie.updateMany({ _id: row.imdbId }, document, (dbErr) => {
//         if (dbErr) {
//           console.error(dbErr);
//           console.log(row.imdbId);
//         }
//       });
//     }
//     catch (e) {
//       console.error(e);
//       console.log(row.imdbId);
//     }
//   });
//   console.log("Update complete!");


// }



// function replacePropertiesWithNames(line, properties) {
//   const res = {};
//   properties.forEach(property => {
//     try {
//       const arr = JSON.parse(line[property]);
//       if (Array.isArray(arr)) { res[property] = arr.map(entry => entry.name); }
//       else { res[property] = arr; }
//     }
//     catch (e) { console.log(e); console.log(line); console.log(property); }
//   });
//   return res;
// }

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

async function readTopNMoviesFromDB(movieCount) {
  const moviesCollection = await moviesCollectionPromise;
  return moviesCollection.find({}, { limit: movieCount }).toArray();
}

function to(promise) {
  return promise.then(data => [null, data])
    .catch(err => [err]);
}



module.exports = { listDistinctYears };
