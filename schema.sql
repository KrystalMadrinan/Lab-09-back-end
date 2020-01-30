-- one for each api
-- varchar is max characters, variable length
-- numeric(p,s) # of digits stored to the left and to the right of the decimal point

DROP TABLE IF EXISTS locations, weather, events;

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(100),
    formattedquery VARCHAR(100),
    latitude float,
    longitude float
);

CREATE TABLE weather (
    id SERIAL PRIMARY KEY,
    forecast VARCHAR(100),
    time VARCHAR(100)
);

CREATE TABLE  events (
    id SERIAL PRIMARY KEY,
    link VARCHAR(100),
    date VARCHAR(100),
    summary VARCHAR(100)
);
