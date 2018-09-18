const countryCodesObj = require("./countryCodes.json");
const fs = require("fs");

const countryCodes = Object.values(countryCodesObj);
// console.log(countryCodes[0]);

const countryCodesClean = countryCodes.map(entry => ({
  name: entry.name,
  "alpha-2": entry["alpha-2"],
  "country-code": entry["country-code"]
}));
// console.log(countryCodesClean[0]);

fs.writeFile(
  "countryCodesClean.json",
  JSON.stringify(countryCodesClean),
  "utf8",
  () => console.log("Done writing country codes to file!")
);
