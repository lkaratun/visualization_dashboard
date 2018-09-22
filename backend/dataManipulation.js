const { MongoClient } = require("mongodb");
require("dotenv").load();
const assert = require("assert");

const moviesCollectionPromise = (function setUpDBConnection() {
  const dbUrl = `mongodb://${process.env.dbUserName}:${
    process.env.dbPassword
  }@levkaratun.com:27017/moviesDB`;
  return MongoClient.connect(dbUrl)
    .then(client => client.db("moviesDB").collection("movies"))
    .catch(err => console.log(err));
})();

async function fillReleaseYears() {
  const moviesCollection = await moviesCollectionPromise;
  const query = {
    releaseDate: { $exists: true },
    releaseYear: { $exists: false }
  };
  const projection = {
    releaseDate: 1
  };
  moviesCollection.find(query, { projection }).forEach(async document => {
    const releaseYear = document.releaseDate.toISOString().slice(0, 4);
    console.log(document);

    await moviesCollection.update(
      { _id: document._id },
      { $set: { releaseYear } },
      (err, status) => {
        assert.equal(err, null);
      }
    );
    console.log(document._id, document.releaseDate, releaseYear);
  });
}
fillReleaseYears();

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
