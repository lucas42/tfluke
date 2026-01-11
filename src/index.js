import express from 'express';

import readFile from 'fs-readfile-promise'
import TFLFetcher from './fetchers/tfl.js'
import NRFetcher from './fetchers/national-rail.js'
import ControllerClass from './controller.js'

import Route from './classes/route.js'
import Stop from './classes/stop.js'
import Vehicle from './classes/vehicle.js'
import Network from './classes/network.js'
import Platform from './classes/platform.js'
import Event from './classes/event.js'
import localdata from './sources/localdata.js'
import boatdata from './sources/boatdata.js'
var app = express();
app.set('view engine', 'html');
app.set('views', './templates');
const Controller = ControllerClass(templateid => {
	var templatePath = app.get('views')+'/'+templateid+'.'+app.get('view engine');
	return readFile(templatePath, "utf-8");
}, (source, type, id, params) => {
	switch(source) {
		case 'tfl':
			return TFLFetcher.fetchData(type, id, params);
		case 'national-rail':
			return NRFetcher.fetchData(type, id, params);
	}
});
app.get('*splat', function(req, res, next) {
	Controller.process(req.path, {accept: req.get("accept")}, req.query).then(result => {
		switch (result.action) {
			case 'response':
				res.set(result.headers).send(result.body);
				break;
			case 'redirect':
				res.redirect(result.path);
				break;
			case 'notfound':
				res.status(404).send(result.message);
				break;
			case 'unknown':
				next();
				break;
			default:
				throw `Unexpected action from controller ${result.action}`;
		}
	}).catch(error => {
		if (typeof error !== 'object') error = new Error(error);
		if ('message' in error) error.message = `[${(new Date()).toISOString()}] ${error.message}`;
		if (error.type == "request-timeout") {
			console.error(error.message);
			res.status(502).send("A request to an upstream timed out.  Please try again later.");
		} else {
			console.trace(error);
			res.status(500).send("An error occurred: "+error);
		}
	});
});
import './update-times.js'
app.get('/data.json', function (req, res) {
	var output = {
		networks: Network.getAllSerialised(),
		routes: Route.getAllSerialised(),
		stops: Stop.getAllSerialised(),
		platforms: Platform.getAllSerialised(),
		vehicles: Vehicle.getAllSerialised(),
		events: Event.getAllSerialised(),
	};
	res.send(output);
});
app.get('/resources/style.css', function (req, res) {
	res.sendFile('style.css', {root: '.', maxAge:'2m'});
});
app.get('/resources/manifest.json', function (req, res) {
	res.sendFile('manifest.json', {root: '.', maxAge:'2m'});
});
app.get('/resources/fonts/led', function (req, res) {
	res.sendFile('fonts/led.ttf', {root: '.', maxAge:'30m'});
});
app.get('/resources/script.js', function (req, res) {
	res.sendFile('bin/clientscripts.js', {root: '.', maxAge:'2m'});
});
app.get('/serviceworker.js', function (req, res) {
	res.sendFile('bin/serviceworker.js', {root: '.', maxAge:'2m'});
});
app.get('/_info', function (req, res) {
	const output = {
		system: 'tfluke_app',
		checks: {},
		metrics: {},
		ci: {
			circle: "gh/lucas42/tfluke",
		},
		icon: "/img/icon.png",
		network_only: false,
		title: "Transport",
		show_on_homepage: true,
	};
	res.send(output);
});
app.use('/img', express.static('img', {maxAge:'5m'}));
app.use('/resources/templates', express.static('templates', {maxAge:'2m'}));
if (!process.env.PORT) throw 'Environment variable PORT not set';
var server = app.listen(process.env.PORT, function () {
  console.log('App listening at http://%s:%s', server.address().address, server.address().port);
});

localdata.start();
boatdata.start();
TFLFetcher.loadAllRoutes();