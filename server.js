'use strict';
// Thomas S

// Load environment variables from the .env
require('dotenv').config();

// Declare application dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
// const cache = {};


// POSTGRES
const pg = require('pg');
let DATABASE_URL = process.env.DATABASE_URL;
const client = new pg.Client(DATABASE_URL);
client.on('error', err => console.error('pg probs', err));


// Application setup
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());


// ROUTES
// route syntax = app.<operation>('route', callback);

app.get('/', (request, response) => {
  response.send('Proof of life');
});
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/events', eventsHandler);
app.get('/movies', moviesHandler);
app.get('/yelp', yelpHandler);


// ***ROUTES END HERE***




// ***LOCATION STARTS HERE***

function locationHandler(request, response) {
  let city = request.query.city;
  console.log('from location handler: ', request.query);
  let SQL = `SELECT * FROM locations WHERE search_query = '${city}';`;
  // No more cache stuff
  client.query(SQL)
    .then(results => {
      if (results.rows.length > 0) {
        console.log('from database: ', results.rows[0]);
        response.send(results.rows[0]);
      } else {
        try {
          // Getting info for object
          let locationUrl = `https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json&limit=1`;

          superagent.get(locationUrl)
            .then(data => {
              const geoData = data.body[0]; //first item
              const location = new Location(city, geoData);
              const { search_query, formatted_query, latitude, longitude } = location;
              let insertSql = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ('${search_query}', '${formatted_query}', '${latitude}', '${longitude}');`;
              // Below replaces city cache thing
              client.query(insertSql);
              response.send(location);
            })
            .catch(() => {
              errorHandler('not found', request, response);
            });
        } catch (error) {
          errorHandler(error, request, response);
        }
      }
    });
}


// Location Object Constructor
function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.display_name;
  this.latitude = geoData.lat;
  this.longitude = geoData.lon;
}

// ***LOCATION ENDS HERE***




// ***WEATHER STARTS HERE***

function weatherHandler(request, response) {
  try {
    const latitude = request.query.latitude;
    const longitude = request.query.longitude;
    let weatherURL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${latitude},${longitude}`;

    superagent.get(weatherURL)
      .then(data => {
        const forecastArray = data.body.daily.data.map(object => new Weather(object));
        response.send(forecastArray);
      });
  } catch (error) {
    errorHandler('something went wrong', request, response);
  }
}

// Weather Object Constructor

function Weather(weatherObj) {
  this.forecast = weatherObj.summary
  this.time = new Date(weatherObj.time * 1000).toString().slice(0, 15);
}

// ***WEATHER ENDS HERE***




// ***EVENTS START HERE***

function eventsHandler(request, response) {
  console.log('from events handler: ', request.query);
  const { search_query } = request.query;
  let eventurl = `http://api.eventful.com/json/events/search?location=${search_query}&app_key=${process.env.EVENTFUL_API_KEY}&within=7&date=Future&page_size=20`;

  superagent.get(eventurl)
    .then(data => {
      // console.log(data);
      let dataObj = JSON.parse(data.text).events.event;
      let eventsArray = dataObj.map(object => new Event(object));
      // console.log(eventsArray);
      response.send(eventsArray);
    })
    .catch(() => {
      errorHandler('something went wrong', request, response);
    })
}



// Events Constructor
function Event(eventsObj) {
  this.link = eventsObj.url;
  this.name = eventsObj.title;
  this.event_date = eventsObj.start_time;
  this.summary = eventsObj.description;
}

// ***EVENTS END HERE***



// ***MOVIES START HERE***

function moviesHandler(request, response) {
  let city = request.query.search_query;
  let moviesUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&page=1&query=${city}`;

  superagent.get(moviesUrl)
    .then(data => {
      let moviesArr = data.body.results.map((object => new Movies(object)));
      response.send(moviesArr);
      console.log(moviesArr);
    })
    .catch(() => {
      errorHandler('something went wrong', request, response);
    })
}



// Movies Constructor Function

function Movies(moviesObj) {
  this.title = moviesObj.title;
  this.overview = moviesObj.overview;
  this.average_votes = moviesObj.vote_average;
  this.total_votes = moviesObj.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500${moviesObj.poster_path}`;
  this.popularity = moviesObj.popularity;
  this.released_on = moviesObj.release_date;
}





// ***YELP STARTS HERE***


function yelpHandler(request, response) {
  let lat = request.query.latitude;
  let lon = request.query.longitude;
  let yelpUrl = `https://api.yelp.com/v3/businesses/search?term=restaurants&latitude=${lat}&longitude=${lon}&limit=20`;

  superagent.get(yelpUrl).set('Authorization',`Bearer ${process.env.YELP_API_KEY}`)
    .then(data => {
      console.log(data);
      let yelpArr = data.body.businesses.map((object => new YelpList(object)));
      response.send(yelpArr);
      console.log(yelpArr);
    })
    .catch(() => {
      errorHandler('something went wrong', request, response);
    })
}



// Yelp Constructor Function

function YelpList(object) {
  this.name = object.name;
  this.image_url = object.image_url;
  this.price= object.price;
  this.rating= object.rating;
  this.url= object.url
}


// Error Handler

function errorHandler(error, request, response) {
  response.status(500).send(error);
}



// Ensure the server is listening for requests
// ***This must be at the end of the file***

client.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server up on port ${PORT}`);
    })
  })
