const fetch = require("jest-fetch-mock");
const app = require("./app");

describe("getListOfYearsFromDB", () => {
  it("returns an array", () => {
    expect.assertions(1);
    jest.mock("jest-fetch-mock");
    const resp = [
      {
        _id: "tt0038256",
        genres: [
          "Romance",
          "Comedy"
        ],
        spokenLanguages: [
          "Français"
        ],
        id: 31998,
        popularity: 1.02174,
        runtime: 111,
        voteAverage: 6,
        voteCount: 5,
        adult: false,
        releaseDate: "1945-01-01T12:00:00.000Z",
        originalLanguage: "en",
        originalTitle: "Without Love",
        title: "Without Love",
        overview: "In World War II Washington DC, scientist Pat Jamieson's assistant, Jamie Rowan, enters a loveless marriage with him. Struggles bring them closer together.",
        posterPath: "/5Ssz40iVEhR3iy2fc6ndJvcaEEN.jpg",
        revenue: 0,
        status: "Released",
        tagline: "She was a bashful bride! He walked in his sleep!",
        productionCountries: [
          {
            _id: "5b5956106526322e802578e7",
            letterCode: "US",
            name: "United States of America"
          }
        ],
        __v: 0,
        releaseYear: "1945"
      },
      {
        _id: "tt0038260",
        genres: [
          "Music",
          "Comedy",
          "Fantasy"
        ],
        spokenLanguages: [
          "English"
        ],
        id: 34127,
        popularity: 2.395994,
        runtime: 98,
        voteAverage: 5.2,
        voteCount: 11,
        adult: false,
        releaseDate: "1945-01-01T12:00:00.000Z",
        originalLanguage: "en",
        originalTitle: "Wonder Man",
        title: "Wonder Man",
        overview: "Boisterous nightclub entertainer Buzzy Bellew was the witness to a murder committed by gangster Ten Grand Jackson. One night, two of Jackson's thugs kill Buzzy and dump his body in the lake at Prospect Park in Brooklyn. Buzzy comes back as a ghost and summons his bookworm twin, Edwin Dingle, to Prospect Park so that he can help the police nail Jackson.",
        posterPath: "/uvvdbVmk04jNFH0Zl3qsgAIsAXa.jpg",
        revenue: 0,
        status: "Released",
        productionCountries: [
          {
            _id: "5b5956106526322e80257a04",
            letterCode: "US",
            name: "United States of America"
          }
        ],
        __v: 0,
        releaseYear: "1945"
      }];


    fetch.mockResponseOnce(resp);
    return expect(app.getListOfYearsFromDB()).resolves.toBeInstanceOf(Array);
  });
});
