import Route from '../classes/route.js'
import Stop from '../classes/stop.js'
import Vehicle from '../classes/vehicle.js'
import Network from '../classes/network.js'
import Platform from '../classes/platform.js'
import Event from '../classes/event.js'
const supportedModes = ["tube", "dlr", "river-bus", "elizabeth-line", "overground", "tram"];
let tflNetwork = new Network("tfl");

function tflapireq(path) {
	var parsed;
	var url = "https://api.tfl.gov.uk"+path;
	if (url.indexOf('?') > -1) {
		url += '&';
	} else {
		url += '?';
	}
	url += "&app_key=";
	if (process.env.TFL_KEY) url += encodeURIComponent(process.env.TFL_KEY);
	return fetch(url, {timeout: 5000}).then(response => {
		if (response.status == 429) throw new Error(`TFL API Rate Limited`);
		if (response.status == 404) {
			console.log(`TfL API returned 404 for ${path} (expected given TfL data quality)`);
			throw 'notfound';
		}
		if (response.status != 200) throw new Error(`Unexpected status code ${response.status}, ${path}`);
		return response.json().then(data => {
			return {
				data: data, 
				date: response.headers.get('date'),
			};
		})
	});
}

export function fetchData(type, id, params) {
	switch (type) {
		case "routes": {
			return tflapireq("/Line/Route").then(({data, date}) => {
				var routes = {};
				data.forEach(function (linedata) {
					if (supportedModes.indexOf(linedata.modeName) == -1) return;
					var route = new Route(tflNetwork, linedata.id);
					route.setField('title', linedata.name.replace(/ line$/, ''));
					route.setField('name', linedata.name.replace(/ line$/, ''));
					route.setField('lastUpdated', date);
					route.setField("mode", linedata.modeName);
					routes[linedata.id] = route;
				});
				return routes;
			}).then(routes => {
				return tflapireq("/Line/"+Object.keys(routes).join(',')+"/Status").then(({data, date}) => {
					data.forEach(function (linedata) {
						var route = new Route(tflNetwork, linedata.id);
						var lowestseverity = 100;
						var loweststatus = "Unknown";
						var details = "";
						linedata.lineStatuses.forEach(function (status) {
							if (status.statusSeverity < lowestseverity) {
								lowestseverity = status.statusSeverity;
								loweststatus = status.statusSeverityDescription;
							}
							if (status.reason) {
								if (details) details += "\n\n";
								details += status.reason.replace(/^[^:]*:\s*/, '');
							}
						});
						route.setField('status', loweststatus);
						route.setField('details', details);
					});
					return Object.values(routes).sort(Route.sort).map(route => route.getData());
				});
			}).then(routeList => {

				return {
					routes: routeList,//Route.getRouteList(),
					//routeData: JSON.stringify(Route.getRouteList(true)),
					lastUpdated: Date.now(),//Route.getOldestUpdateTime(),
					cssClass: 'homepage',
					classType: 'RouteList',
					title: 'TFL Services',
				}

			});
		}
		case "route": {
			let  route;
			return tflapireq("/Line/"+id).then(({data, date}) => {
				if (!data.length) throw "notfound";
				route = new Route(tflNetwork, id);
				route.setField("name", data[0].name.replace(/ line$/, ''));
				route.setField("title", data[0].name.replace(/ line$/, ''));
				route.setField("lastUpdated", date);
				route.setField("mode", data[0].modeName);
				return tflapireq("/Line/"+route.getCode()+"/StopPoints");
			}).then(({data, date}) => {
				data.forEach(data => {

					// Ignore child stations - These will be added as platforms on the stop page
					if (data.naptanId != data.stationNaptan) return;
					var stop = new Stop(route.getNetwork(), data.naptanId);
					stop.setField('title', data.commonName);
					stop.setField('lastUpdated', date);

					// Add all interchanges for this stop (even if there's no trains on departure boards)
					/*data.lineModeGroups.forEach(function (networkdata) {
						if (supportedModes.indexOf(networkdata.modeName) == -1) return;
						var network = new Network(networkdata.modeName);
						if (network == route.getNetwork()) return;
						networkdata.lineIdentifier.forEach(function (lineid) {
							var interchange = new Stop(network, data.naptanId);
							if (!interchange.getField('title')) stop.setField('title', data.commonName);
							stop.addExternalInterchange(interchange);
						});
					});*/
					if (!data.additionalProperties) data.additionalProperties = [];
					data.additionalProperties.forEach(function (additionaldata) {
						if (additionaldata.key == "WiFi") {
							stop.setField('wifi', additionaldata.value == "yes");
						}
						if (additionaldata.key == "Zone") {
							stop.setField('zone', additionaldata.value);
						}

						// There are 2 fields about toilets (presumably from different sources) - try both.
						if (additionaldata.key == "Toilets" && additionaldata.value.indexOf("yes") == 0) {
							stop.setField('toilet', true);

							// If there's a note, it follows 'yes', then a space.  It's usually surrounded by brackets
							if (additionaldata.value.length > 4) {
								stop.setField('toiletnote', additionaldata.value.substr(4));
							}
						}
						if (additionaldata.key == "Toilet" && additionaldata.value == "Yes") {
							stop.setField('toilet', true);
						}

						// TolietNote values are usually surrounded by brackets
						if (additionaldata.key == "ToiletNote") {
							stop.setField('toiletnote', additionaldata.value);
						}
					});
					let routeModes = {};
					data.lineModeGroups.forEach(modegroup => {
						modegroup.lineIdentifier.forEach(lineid => {
							routeModes[lineid] = modegroup.modeName;
						})
					});
					route.addStop(stop);
				});
				return route.getDataTree();
			});
		}
		case "stop": {
			let network = new Network('tfl');
			let stop;
			return tflapireq("/StopPoint/"+id).then(({data, date}) => {
				stop = new Stop(network, id);
				stop.setField('title', data.commonName);
				stop.setField('lastUpdated', date);

				// Add all interchanges for this stop (even if there's no trains on departure boards)
				/*data.lineModeGroups.forEach(function (networkdata) {
					if (supportedModes.indexOf(networkdata.modeName) == -1) return;
					var network = new Network(networkdata.modeName);
					if (network == route.getNetwork()) return;
					networkdata.lineIdentifier.forEach(function (lineid) {
						var interchange = new Stop(network, data.naptanId);
						if (!interchange.getField('title')) stop.setField('title', data.commonName);
						stop.addExternalInterchange(interchange);
					});
				});*/
				if (!data.additionalProperties) data.additionalProperties = [];
				data.additionalProperties.forEach(function (additionaldata) {
					if (additionaldata.key == "WiFi") {
						stop.setField('wifi', additionaldata.value == "yes");
					}
					if (additionaldata.key == "Zone") {
						stop.setField('zone', additionaldata.value);
					}

					// There are 2 fields about toilets (presumably from different sources) - try both.
					if (additionaldata.key == "Toilets" && additionaldata.value.indexOf("yes") == 0) {
						stop.setField('toilet', true);

						// If there's a note, it follows 'yes', then a space.  It's usually surrounded by brackets
						if (additionaldata.value.length > 4) {
							stop.setField('toiletnote', additionaldata.value.substr(4));
						}
					}
					if (additionaldata.key == "Toilet" && additionaldata.value == "Yes") {
						stop.setField('toilet', true);
					}

					// TolietNote values are usually surrounded by brackets
					if (additionaldata.key == "ToiletNote") {
						stop.setField('toiletnote', additionaldata.value);
					}
				});
				let routeModes = {};
				data.lineModeGroups.forEach(modegroup => {
					modegroup.lineIdentifier.forEach(lineid => {
						routeModes[lineid] = modegroup.modeName;
					})
				});
				let StopPointReqs = data.lineGroup.map(stoppoint => {

					// Really hacky way to work out which ID to use when looking up arrival data
					let id;
					if (routeModes[stoppoint.lineIdentifier[0]] == "bus") {
						id = stoppoint.naptanIdReference;
					} else {
						id = stoppoint.stationAtcoCode;
					}
					return tflapireq("/StopPoint/"+id+"/Arrivals");
				});
				return Promise.all(StopPointReqs);
			}).then(allpoints => {
				allpoints.forEach(({data, date}) => {
					data.forEach(function (arrival) {
						var route = new Route(tflNetwork, arrival.lineId);
						route.addStop(stop);
						route.setField("mode", arrival.modeName);

						// API sends the string 'null', rather than a null value
						if (arrival.platformName == 'null') {
							arrival.platformName = null;
						}
						var platform = new Platform(stop, arrival.platformName);
						platform.addRoute(route);
						platform.setField("mode", arrival.modeName);
						var vehicle;
						if (arrival.vehicleId) {
							let vehicleId = arrival.vehicleId;
							if (arrival.modeName == "tube") {
								vehicleId = arrival.lineId + "_" + vehicleId;
							}
							vehicle = new Vehicle(route, vehicleId);

						// If there's no vehicle ID, then make up a random one and mark it as a ghost
						} else {
							vehicle = new Vehicle(route, Math.random());
							vehicle.setField('ghost', true);
							platform.setField('hasghosts', true);
						}

						vehicle.setField('destination', arrival.destinationName);
						vehicle.setField('lastUpdated', date);
						var event = new Event(vehicle, platform);
						event.setField('time', new Date(arrival.expectedArrival));
						event.setField('lastUpdated', date);
						event.updateRelTime();
					});
				});
				return stop.getDataTree();
			});
		}

		case "vehicle": {
			if (!params.route) params.route = "unknown";
			let route = new Route(tflNetwork, params.route);
			route.setField("mode", params.mode);
			let vehicle = new Vehicle(route, id);
			let vehicleId, lineId, vehicleIdComponents = id.split("_");
			if (vehicleIdComponents.length > 1) {
				vehicleId = vehicleIdComponents[1];
				lineId = vehicleIdComponents[0];
				vehicle.setField("setNo", vehicleId);
			} else {
				vehicleId = vehicleIdComponents[0];
			}
			if (!vehicleId) return Promise.reject("notfound");
			return tflapireq("/Vehicle/"+vehicleId+"/Arrivals").then(({data, date}) => {
				data.forEach(function (arrival) {

					// Tube trains have shared vehicleIds, so need to filter to only relevant ones
					if (lineId && arrival.lineId != lineId) return;
					var stop = new Stop(tflNetwork, arrival.naptanId);
					stop.setField('title', arrival.stationName);
					stop.setField('lastUpdated', date);

					// API sends the string 'null', rather than a null value
					if (arrival.platformName == 'null') {
						arrival.platformName = null;
					}
					var platform = new Platform(stop, arrival.platformName);
					platform.addRoute(route);
					platform.setField("mode", params.mode);
					var event = new Event(vehicle, platform);
					event.setField('time', new Date(arrival.expectedArrival));
					event.setField('lastUpdated', date);
					event.updateRelTime();
				});
			return vehicle.getDataTree();
			});
		}
		default: {
			return Promise.reject("notfound");
		}
	}
}

export async function loadAllRoutes() {
	try {
		const {routes} = await fetchData('routes');
		for (const route of routes) {
			console.log(`Loading data for ${route.title}...`);
			const {stops} = await fetchData('route', route.code);
		}
	} catch(error) {
		if (error !== 'notfound') console.error("Error occured while preloading stops", error);
	}
}

export default {
	fetchData,
	loadAllRoutes,
}