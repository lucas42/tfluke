import test from 'ava';
import Network from '../src/classes/network.js'
import Route from '../src/classes/route.js'
import Stop from '../src/classes/stop.js'
test.afterEach.always('Tidy up routes from global scope', test => {
	Route.getAll().forEach(route => {
		route.deleteSelf();
	})
})
test('Create Route', test => {
	var network = new Network('id123');
	var route = new Route(network, 'id246');
	test.is(route.getCode(), 'id246');
	test.deepEqual(route.getIndex(), [['id123'],'id246']);
	test.is(route.getCssClass(), 'route_id246 network_id123');
	test.is(route.getLink(), '/tfl/route/id246');
	test.is(route.getNetwork().getCode(), 'id123');
	test.is(route.getQualifiedName(), 'Id246');
	test.is(route.getSymbol(), false);
});
test('getQualifiedName with non-string title does not throw', test => {
	var network = new Network('id999');
	var route = new Route(network, 'id999');
	// Simulate TfL returning a non-string name field (e.g. null or a number)
	route.setField('title', null);
	test.notThrows(() => route.getQualifiedName());
	route.setField('title', 42);
	test.notThrows(() => route.getQualifiedName());
});
test('Refresh Route', test => {
	var network = new Network('id123');
	var route = new Route(network, 'id246');
	route.refresh = function () {
		test.pass("Refresh function called once");
	}
	route.attemptRefresh(() => {
		route.refresh = function () {
			test.fail("Refresh function called too many times");
		}
		route.attemptRefresh();
		route.attemptRefresh();
	});
});
test('Get By Stop', test => {
	var network = new Network('id234');
	var stop1 = new Stop(network, 'stop1');
	var stop2 = new Stop(network, 'stop2');
	var stop3 = new Stop(network, 'stop3');
	var route1 = new Route(network, 'route1');
	var route2 = new Route(network, 'route2');
	var route3 = new Route(network, 'route3');
	route1.addStop(stop1);
	route1.addStop(stop2);
	route1.addStop(stop3);
	route2.addStop(stop3);
	route3.addStop(stop2);
	route3.addStop(stop3);
	test.deepEqual(Route.getByStop(stop1), [route1]);
	test.deepEqual(Route.getByStop(stop2), [route1,route3]);
	test.deepEqual(Route.getByStop(stop3), [route1,route2,route3]);
});
test('Route List', test => {
	var network = new Network('id345');
	var route1 = new Route(network, 'route1');
	var route2 = new Route(network, 'route2');
	var route3 = new Route(network, 'route3');
	test.deepEqual(Route.getRouteList(), [route1.getData(), route2.getData(), route3.getData()]);
});
test('Route List Lite', test => {
	var network = new Network('id456');
	var route1 = new Route(network, 'route1');
	route1.setField("status", "Good Service");
	var route2 = new Route(network, 'route2');
	route2.setField("name", "Route Number 2");
	route2.setField("status", "Unreliable");
	var route3 = new Route(network, 'route3');
	test.deepEqual(Route.getRouteList(true), [{
		status: 'Good Service',
		name: 'route1',
		network: 'id456',
	},{
		status: 'Unreliable',
		name: 'Route Number 2',
		network: 'id456',
	},{
		status: undefined,
		name: 'route3',
		network: 'id456',
	}]);
});
test('Sort Routes', test => {
	var tube = new Network('tube');
	var dlr = new Network('dlr');
	var overground = new Network('overground');
	var other = new Network('hovercraft');
	var route5 = new Route(overground, 'overground');
	route5.setField("mode", "overground");
	var route2 = new Route(tube, 'tube2');
	route2.setField("mode", "tube");
	var route1 = new Route(tube, 'tube1');
	route1.setField("mode", "tube");
	var route4 = new Route(dlr, 'dlr');
	route4.setField("mode", "dlr");
	var route6 = new Route(other, 'special1');
	route6.setField("mode", "hovercraft");
	var route7 = new Route(other, 'special2');
	route7.setField("mode", "hovercraft");
	var route3 = new Route(tube, 'tube3');
	route3.setField("mode", "tube");
	test.deepEqual(Route.getRouteList(), [route1.getData(), route2.getData(), route3.getData(), route4.getData(), route5.getData(), route6.getData(), route7.getData()]);
});