import test from 'ava';
import Network from '../src/classes/network.js'
import Stop from '../src/classes/stop.js'
import Route from '../src/classes/route.js'
import Vehicle from '../src/classes/vehicle.js'

var net1 = new Network('net1');
var route1 = new Route(net1, 'route1');
route1.setField('name', "Routeface");
var stop1 = new Stop(net1, 'stop1');
stop1.setField('title', "🚂 Station");
var vehicle1 = new Vehicle(route1, '9015450000602417');
vehicle1.setField('lastUpdated', "yesterday");

// Module under test
import Controller from '../src/controller.js'

/** Homepage **/
test('Homepage Render', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{headtitle}}/{{title}}");
		if (id == "routes") return Promise.resolve("homepage");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		if (type == "routes") return Promise.resolve({datapoint: "livedata", title: "The Title", routes: []});
		test.fail(`Unexpected data fetch for '${source}', '${type}'`);
		return Promise.resolve("error");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/');
	test.is(result.action, 'response');
	test.is(result.body, 'StartPage homepage EndPage TFLuke/TFLuke');
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
	});
});

test('TFL Page', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{headtitle}}");
		if (id == "routes") return Promise.resolve("tflpage {{datapoint}}");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		if (source == "tfl" && type == "routes") return Promise.resolve({datapoint: "livedata", title: "The Title"});
		test.fail(`Unexpected data fetch for '${source}', '${type}'`);
		return Promise.resolve("error");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/tfl');
	test.is('response', result.action);
	test.is('StartPage tflpage livedata EndPage TFLuke - The Title', result.body);
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
	});
});


/** Route Page **/
test('Route Render', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{headtitle}}/{{title}}");
		if (id == "route") return Promise.resolve("route");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/route/net1/route1');
	test.is(result.action, 'response');
	test.is(result.body, 'StartPage route EndPage TFLuke - Route1/Route1');
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
	});
});
test('Route Redirect', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/route/');
	test.is(result.action, 'redirect');
	test.is(result.path, '/');
});
test('Route Not Found', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/route/net1/route7');
	test.is(result.action, 'notfound');
	test.is(result.message, "Can't find route /net1/route7");
});

test('Dynamic Route', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{headtitle}}");
		if (id == "route") return Promise.resolve("route {{datapoint}}");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		if (source == "tfl" && type == "route" && id == "bob") 
			return Promise.resolve({datapoint: "livedata", title: "The Title"});
		test.fail(`Unexpected data fetch for '${source}', '${type}', '${id}'`);
		return Promise.resolve("error");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/tfl/route/bob');
	test.is('response', result.action);
	test.is('StartPage route livedata EndPage TFLuke - The Title', result.body);
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
	});
});
test('Dynamic Route Not Found', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		return Promise.reject("notfound");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/tfl/route/bob2');
	test.is('notfound', result.action);
	test.is("Can't find route", result.message);
});

test('Data Fetch Error', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		return Promise.reject(new Error("connection problem"));
	}
	await test.throwsAsync(Controller(getTemplate, dataFetcher).process('/tfl/route/bob2'), { message: "connection problem" });
});
test('Dynamic Route Data', async test => {
	function getTemplate(id) {
		test.fail(`Template shouldn't be needed to serve JSON`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		if (source == "tfl" && type == "route" && id == "bob") 
			return Promise.resolve({datapoint: "livedata", title: "The Title"});
		test.fail(`Unexpected data fetch for '${source}', '${type}', '${id}'`);
		return Promise.resolve("error");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/tfl/route/bob.json');
	test.is('response', result.action);
	test.deepEqual({datapoint: "livedata", title: "The Title"}, JSON.parse(result.body));
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'application/json; charset=utf-8',
	});
});


/** Stop Page **/
test('Stop Render', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{headtitle}}/{{title}}");
		if (id == "stop") return Promise.resolve("stop");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/stop/net1/stop1');
	test.is(result.action, 'response');
	test.is(result.body, 'StartPage stop EndPage TFLuke - 🚂 Station/🚂 Station');
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
	});
});
test('Stop Redirect', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/stop/');
	test.is(result.action, 'redirect');
	test.is(result.path, '/');
});
test('Stop Not Found', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/stop/net1/route1');
	test.is(result.action, 'notfound');
	test.is(result.message, "Can't find stop /net1/route1");
});

test('Dynamic Stop', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{headtitle}}");
		if (id == "stop") return Promise.resolve("stop {{datapoint}}");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		test.is("tfl", source);
		test.is("stop", type);
		test.is("mordor", id);
		return Promise.resolve({datapoint: "livedata", title: "Mordor, Middle Earth"});
	}
	const result = await Controller(getTemplate, dataFetcher).process('/tfl/stop/mordor');
	test.is('response', result.action);
	test.is('StartPage stop livedata EndPage TFLuke - Mordor, Middle Earth', result.body);
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
	});
});


/** Vehicle Page **/
test('Vehicle Render', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{title}}");
		if (id == "vehicle") return Promise.resolve("vehicle");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/vehicle/net1/route1/9015450000602417');
	test.is(result.action, 'response');
	test.is(result.body, 'StartPage vehicle EndPage Galaxy Clipper (ROUTEFACE)');
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
	});
});
test('Vehicle Redirect', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/vehicle/');
	test.is(result.action, 'redirect');
	test.is(result.path, '/');
});
test('Vehicle Not Found', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/vehicle/net1/route1/train3');
	test.is(result.action, 'notfound');
	test.is(result.message, "Can't find vehicle train3");
});

test('Dynamic Vehicle', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{headtitle}}");
		if (id == "vehicle") return Promise.resolve("vehicle {{datapoint}}");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		if (source == "tfl" && type == "vehicle" && id == "123") 
			return Promise.resolve({datapoint: "livedata", title: "The Title"});
		test.fail(`Unexpected data fetch for '${source}', '${type}', '${id}'`);
		return Promise.resolve("error");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/tfl/vehicle/123');
	test.is('response', result.action);
	test.is('StartPage vehicle livedata EndPage TFLuke - The Title', result.body);
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
	});
});
test('Dynamic Vehcile Not Found', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher(source, type, id) {
		return Promise.reject("notfound");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/tfl/vehicle/321');
	test.is('notfound', result.action);
	test.is("Can't find vehicle", result.message);
});

/** Unknown Type **/
test('Page Not Found', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/smartypants');
	test.is(result.action, 'unknown');
});


/** Get Partial **/
test('Vehicle Partial Render', async test => {
	function getTemplate(id) {
		if (id == "vehicle") return Promise.resolve("vehicle {{title}}");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher).process('/vehicle/net1/route1/9015450000602417', {accept: 'text/partial-html'});
	test.is(result.action, 'response');
	test.is(result.body, 'vehicle Galaxy Clipper (ROUTEFACE)');
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/partial-html; charset=utf-8',
		'title': 'Galaxy Clipper (ROUTEFACE)',
		'cssClass': 'route_route1 network_net1 vehicle_galaxyclipper',
		'classType': 'Vehicle',
		'classID': 'Vehicle-net1,route1,9015450000602417',
		'lastUpdated': 'yesterday',
	});
});

/** Loading Page **/
test('Service Worker Loading Page', async test => {
	function getTemplate(id) {
		if (id == "page") return Promise.resolve("StartPage {{content}} EndPage {{headtitle}}/{{title}}");
		if (id == "loading") return Promise.resolve("loading");
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher, true).process('/loading');
	test.is(result.action, 'response');
	test.is(result.body, 'StartPage loading EndPage TFLuke/');
	test.deepEqual(result.headers, {
		'Cache-Control': 'public, max-age=0',
		'Content-Type': 'text/html; charset=utf-8',
		'refresh': '0.01',
	});
});
test('Server Loading Page', async test => {
	function getTemplate(id) {
		test.fail(`Unexpected template id '${id}' used`);
		return Promise.resolve("error");
	}
	function dataFetcher() {
		test.fail("Unneeded call to dataFetcher");
	}
	const result = await Controller(getTemplate, dataFetcher, false).process('/loading');
	test.is(result.action, 'redirect');
	test.is(result.path, '/');
});
