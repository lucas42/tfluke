import Class from './class.js';
import Stop from './stop.js';
import Symbols from '../data/symbols.json' with { type: "json" };
var Route = Class("Route", ["network", "code"], function () {
	this.addRelation({
		singular: 'stop',
		sort: Stop.sort,
	});
	this.addRelation('vehicle');

	// Defaut to using the code as the name
	this.setField('name', this.getCode());
	this.setField('title', this.getCode());
});
Route.prototype.getData = function getData() {
	var output = this.getRawData();
	output.link = this.getLink();
	output.cssClass = this.getCssClass();
	output.network = this.getNetwork().getCode();
	output.symbol = this.getSymbol();
	output.code = this.getCode();
	output.mode = this.getField("mode");
	output.title = this.getQualifiedName();
	return output;
}
Route.prototype.getLiteData = function getLiteData() {
	return {
		status: this.getField("status"),
		name: this.getField("name"),
		network: this.getNetwork().getCode(),
	};
}
Route.prototype.getLink = function getLink() {
	return "/tfl/route/"+encodeURIComponent(this.getCode());
}
Route.prototype.getCssClass = function getCssClass() {
	var cssClass = "";
	var code = this.getCode();
	if (code) cssClass += "route_"+code;
	cssClass += " "+this.getNetwork().getCssClass();
	if (this.getField("mode")) {
		cssClass += " mode_"+this.getField("mode");
	}
	return cssClass;
}
Route.prototype.getQualifiedName = function getQualifiedName() {
	var name = String(this.getField("title") || "");
	if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
	var network = this.getNetwork().getCode();
	if (this.getField("mode") == "tube" || this.getField("mode") == "overground" || this.getField("mode") == "elizabeth-line") {
		name += " Line";
	}
	if (this.getField("mode") == "river-bus" && name.match(/^RB\d/)) {
		name = "Thames Clipper " + name;
	}
	return name;
}
Route.prototype.getSymbol = function getSymbol() {

	// Returning false rather than undefined means in mustache templates it'll override any symbols defined by a parent element
	if (!(this.getField("mode") in Symbols)) return false;
	return Symbols[this.getField("mode")];
}
Route.getByStop = function getByStop(stop) {
	return Route.getByRelatedThing('stop', stop).sort(Route.sort);
}
Route.sort = function sortRoutes(a, b) {
	const modePriority = ['tube','dlr','elizabeth','overground','tram','river-bus','bus'];
	var neta = a.getField("mode");
	var netb = b.getField("mode");

	// Loop through all the modes in priority order
	if (neta != netb) {
		for (var mode in modePriority) {
			if (neta == modePriority[mode]) return -1;
			if (netb == modePriority[mode]) return 1;
		}
	}
	return a.getField("title") > b.getField("title") ? 1 : -1;
}
Route.getRouteList = function (liteData) {
	var routedata = [];
	var routes = Route.getAll().sort(Route.sort);
	routes.forEach(function (route) {
		routedata.push(liteData ? route.getLiteData() : route.getData());
	});
	return routedata;
}
Route.getOldestUpdateTime = function () {
	var oldest = null;
	Route.getAll().forEach(function (route) {
		var lastUpdated = new Date(route.getField("lastUpdated"));
		if (!oldest || lastUpdated < oldest) {
			oldest = lastUpdated;
		}
	});
	return oldest;
}
export default Route;