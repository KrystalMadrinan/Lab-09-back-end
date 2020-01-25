'use strict';

// Load environment variables from the .env
require('dotenv').config();

// Declare application dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const cache = {};


// POSTGRES
const pg = require('pg');
let DATABASE_URL = 'postgres://@localhost:5432/demo';
const client = new pg.Client(DATABASE_URL);
client.on('error', err => console.error('pg probs', err));


// Application setup
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());


// ROUTES
// route syntax = app.<operation>('route', callback);
// Home page route for server testing

app.get('/sql', (request, response) => {
  let SQL = 'SELECT * FROM shapes;';
  let results = client.query(SQL)
    .then(data => {
      // console.log(data.rows);
      response.send(data.rows);
    })
})
app.get('/', (request, response) => {
  response.send('home page!!!!');
});
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/events', eventsHandler);
// app.get('/yelp', yelpHandler);
// app.get('/movies', moviesHandler);

// Location Functions
function locationHandler(request, response) {
  let city = request.query.city;

  //CACHE if location is cache, return location
  if (cache[city]) { // if select * from cityexp where city = request.query.city
    // return location object send to client
    let cacheLocation = cache[city]; // result of the query;
    response.send(cacheLocation);
    // else hit api cahce location INSERT INTO statement, return location object
  } else {

    try {
    // //Getting info for object
      let url = `https://us1.locationiq.com/v1/search.php?key=${process.env.GEOCODE_API_KEY}&q=${city}&format=json&limit=1`;

      superagent.get(url)
        .then(data => {
          const geoData = data.body[0]; //first item
          const location = new Location(city, geoData);
          //let sql= 'your insert into statment goes here;';
          //pg.query(SQL goes here)
          cache[city] = location;
          response.send(location);
        })

    } catch (error) {
      errorHandler('it went wrong.', request, response);
    }
  }
}

// Location Object Constructor
function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.display_name;
  this.latitude = geoData.lat;
  this.longitude = geoData.lon;
}

// End Location Functions
// Begin Weather Functions

function weatherHandler(request, response) {
  try {
    const latitude = request.query.latitude;
    const longitude = request.query.longitude;
    let weatherURL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${latitude},${longitude}`;
    // console.log(weatherURL);

    superagent.get(weatherURL)
      .then(data => {
        const forecastArray = data.body.daily.data.map(object => new Weather(object));
        response.send(forecastArray);
      })
  } catch (error) {
    errorHandler('something went wrong', request, response);
  }
}

// Weather Object Constructor

function Weather(weatherObj) {
  this.forecast = weatherObj.summary
  this.time = new Date(weatherObj.time *1000).toString().slice(0, 15);
}

// End Weather Functions
// Begin Events Functions

function eventsHandler(request, response) {
  try {
    const latitude = request.query.latitude;
    const longitude = request.query.longitude;
    let eventurl = `http://api.eventful.com/json/events/search?app_key=${process.env.EVENTFUL_API_KEY}&keywords=books&where=${latitude},${longitude}&within=7&date=Future&page_size=20`;
    console.log(eventurl);

    superagent.get(eventurl)
      .then(data => {
        console.log('test');
        let obj = JSON.parse(data.text);
        let parsedObj = obj.events.event;
        console.log(parsedObj);
        let eventsarray = parsedObj.map(object => new Event(object));
        response.send(eventsarray);
      })
  } catch (error) {
    errorHandler('something went wrong', request, response);
  }
}

// Error Handler
function errorHandler(error, request, response) {
  response.status(500).send(error);
}

// Events Constructor
function Event(eventsObj) {
  this.link = eventsObj.url;
  this.name = eventsObj.title;
  this.event_date = eventsObj.start_time;
  this.summary = eventsObj.description;
}

// End Events Functions

// Ensure the server is listening for requests
// ***This must be at the end of the file***

client.connect()
  .then( () => {
    app.listen(PORT, () => {
      console.log(`Server up on port ${PORT}`);
    })
  })
// app.listen(PORT, () => console.log(`Server up on port ${PORT}`));

