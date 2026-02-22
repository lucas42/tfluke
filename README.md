# TFLuke
A web app for keeping track of public transport, particularly on forms of transport where data connections are highly variable.

## Dependencies
* docker
* docker compose

## Build-time Dependencies
* nodejs
* npm

## Forms of transport currently supported:
* London Underground
* Docklands Light Railway
* London Overground
* London River Bus Services
* Elizabeth Line

## Running
* ```docker compose up --build```

## Testing
To run unit tests using [ava](https://github.com/avajs/ava), run:

* ```npm install```
* ```npm test```

## Environment Variables
The following environment variables are used by the app:

* **TFL_KEY** - generated here: https://api-portal.tfl.gov.uk/profile
The app appears to run fine without this being set, but registering for a key helps to keep track of which apps are making which requests to the API and increases the limit of requests that can be made.

Environment Variables are stored securely in [lucos_creds](https://github.com/lucas42/lucos_creds)

## Building
The build is configured to run in circleCI and push to Dockerhub when a commit is pushed to the `main` branch in github.