const { MongoClient } = require("mongodb");
require("dotenv").load();
const compression = require("compression");
const csvtojson = require("csvtojson");
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const spdy = require("spdy");

const app = express();
app.use(
  cors({
    origin: [
      "https://movie-data-visualization.levkaratun.com"
      // "https://api.levkaratun.com:3000",
      // "https://ec2-18-188-149-78.us-east-2.compute.amazonaws.com:3000",
      // "https://localhost:1234",
      // "http://localhost:1234",
      // "https://localhost:3000",
      // "http://localhost:3000"
    ],

    credentials: true
  })
);
app.use(compression());

const { keyPath, certPath } = process.env;
// spdy
//   .createServer(
//     {
//       key: fs.readFileSync(keyPath),
//       cert: fs.readFileSync(certPath)
//     },
//     app
//   )
//   .listen(3000, () => console.log("Server is listening to https requests on port 3000"));
app.listen(3000, () => console.log("Server is listening to http requests on port 3000"));


app.get("/convert/:fileName", async (req, res) => {
  try {
    const err = await convertCsvToDsv(req.params.fileName);
    if (err) {
      res.send(err);
    } else {
      res.send("Success!");
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/getScatterPlotData/:countries/:genres/:startYear-:endYear", async (req, res) => {
  try {
    const [err, movies] = await to(
      findMovies({
        countries: JSON.parse(req.params.countries),
        genres: JSON.parse(req.params.genres),
        years: [req.params.startYear, req.params.endYear]
      })
    );
    if (err) {
      console.error(err);
      res.send(err);
    } else {
      res.send(movies);
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/getBarChartData/:countries/:startYear-:endYear", async (req, res) => {
  try {
    const [err, movies] = await to(
      countMoviesPerGenre({
        countries: JSON.parse(req.params.countries),
        years: [req.params.startYear, req.params.endYear]
      })
    );
    if (err) {
      console.error(err);
      res.send(err);
    } else {
      res.send(movies);
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/getMapData/:genres/:startYear-:endYear", async (req, res) => {
  try {
    const [err, movieCounts] = await to(
      countMoviesPerCountry({
        genres: JSON.parse(req.params.genres),
        years: [req.params.startYear, req.params.endYear]
      })
    );
    if (err) {
      console.error(err);
      res.send(err);
    } else {
      res.send(movieCounts);
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/getMovieById/:id", async (req, res) => {
  try {
    const [err, movie] = await to(findMovieById(+req.params.id));
    if (err) {
      console.error(err);
      res.send(err);
    } else {
      res.send(movie);
    }
  } catch (e) {
    console.log(e);
  }
});

app.get("/years", async (req, res) => {
  try {
    console.log("Requested /years");
    const years = await listDistinctYears();
    console.log({ years });
    res.send(years);
  } catch (e) {
    console.error(e);
  }
});

app.get("/", async (req, res) => {
  console.log("Get /");
  try {
    const movies = await readTopNMoviesFromDB(20);
    res.json(movies);
  } catch (e) {
    console.log(e);
  }
});

const moviesCollectionPromise = (function setUpDBConnection() {
  const dbUrl = `mongodb://${process.env.dbUserName}:${process.env.dbPassword}@localhost:27017/moviesDB`;
  return MongoClient.connect(dbUrl)
    .then(client => client.db("moviesDB").collection("movies"))
    .catch(err => console.log(err));
})();

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
    releaseDate: { $gte: startDate, $lte: endDate },
    budget: { $exists: true },
    voteAverage: { $exists: true },
    popularity: { $exists: true }
  };
  if (countries !== null) query["productionCountries.letterCode"] = { $in: countries };
  if (genres !== null) query.genres = { $in: genres };
  const projection = {
    _id: 0,
    voteAverage: 1,
    budget: 1,
    popularity: 1,
    title: 1,
    posterPath: 1,
    id: 1,
    releaseYear: 1
  };
  const moviesCollection = await moviesCollectionPromise;
  return moviesCollection.find(query, { projection }).toArray();
}

async function countMoviesPerGenre({ countries, years }) {
  const [startYear, endYear] = years;
  const startDate = new Date(`${startYear}-01-01`);
  const endDate = new Date(`${endYear}-12-31`);
  const match = {
    $match: {
      releaseDate: { $gte: startDate, $lte: endDate },
      genres: { $exists: true }
    }
  };
  if (countries !== null) {
    match.$match["productionCountries.letterCode"] = { $in: countries };
  }
  const project = { $project: { _id: 0, genres: 1 } };
  const unwind = { $unwind: "$genres" };
  const group = { $group: { _id: "$genres", count: { $sum: 1 } } };
  const moviesCollection = await moviesCollectionPromise;
  return moviesCollection.aggregate([match, project, unwind, group]).toArray();
}

async function countMoviesPerCountry({ genres, years }) {
  const [startYear, endYear] = years;
  const startDate = new Date(`${startYear}-01-01`);
  const endDate = new Date(`${endYear}-12-31`);
  const match = {
    $match: {
      releaseDate: { $gte: startDate, $lte: endDate }
    }
  };
  if (genres !== null) {
    match.$match.genres = { $in: genres };
  }
  const project = { $project: { _id: 0, productionCountries: 1 } };
  const unwind = { $unwind: "$productionCountries" };
  const group = {
    $group: { _id: "$productionCountries.letterCode", count: { $sum: 1 } }
  };
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
  if (fs.existsSync(newFileName)) {
    console.log("DSV file already exists!");
    return null;
  }

  const [err, movies] = await to(csvtojson({ delimiter: "," }).fromFile(fileName));
  if (err) {
    console.log(err);
    return err;
  }
  const dsvString = convertArrayOfObjectsToString(movies, {
    columnDelimiter: "|"
  });
  if (dsvString == null) return "File read error";

  fs.writeFile(newFileName, dsvString, fileWriteErr => {
    if (fileWriteErr) {
      return fileWriteErr;
    }
    console.log("The file was saved!");
    return null;
  });
  return null;
}

function convertArrayOfObjectsToString(data, args) {
  let result;
  let firstValueOnLine;

  if (data == null || !data.length) {
    return null;
  }

  const columnDelimiter = args.columnDelimiter || ",";
  const lineDelimiter = args.lineDelimiter || "\n";

  const keys = Object.keys(data[0]);

  result = "";
  result += keys.join(columnDelimiter);
  result += lineDelimiter;

  data.forEach(item => {
    firstValueOnLine = true;
    keys.forEach(key => {
      if (!firstValueOnLine) result += columnDelimiter;
      result += item[key];
      firstValueOnLine = false;
    });
    result += lineDelimiter;
  });

  return result;
}

async function readTopNMoviesFromDB(movieCount) {
  console.log("entered readTopNMoviesFromDB");
  const moviesCollection = await moviesCollectionPromise;
  console.log("received moviesCollection");
  const res = moviesCollection.find({}, { limit: movieCount }).toArray();
  console.log(res);
  return res;
}

function to(promise) {
  return promise.then(data => [null, data]).catch(err => [err]);
}

module.exports = { listDistinctYears, moviesCollectionPromise };
