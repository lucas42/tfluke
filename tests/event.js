import test from 'ava';
import Network from '../src/classes/network.js';
import Route from '../src/classes/route.js';
import Stop from '../src/classes/stop.js';
import Vehicle from '../src/classes/vehicle.js';
import Platform from '../src/classes/platform.js';
import Event from '../src/classes/event.js';

let uid = 0;
function makeEvent() {
	const id = ++uid;
	const net = new Network(`ev-net-${id}`);
	const route = new Route(net, `ev-route-${id}`);
	const vehicle = new Vehicle(route, `ev-vehicle-${id}`);
	const stop = new Stop(net, `ev-stop-${id}`);
	const platform = new Platform(stop, `ev-platform-${id}`);
	return new Event(vehicle, platform);
}

test.afterEach.always('Clean up events', () => {
	Event.getAll().forEach(ev => ev.deleteSelf());
});

test('updateRelTime: past event calls deleteSelf without evaluating getData', t => {
	const event = makeEvent();
	// Set time 60s in the past (well past the 30s threshold)
	event.setField('time', new Date(Date.now() - 60000).toISOString());

	let getDataCalled = false;
	event.getData = function() {
		getDataCalled = true;
		return {};
	};

	let deleteCalled = false;
	const realDelete = event.deleteSelf.bind(event);
	event.deleteSelf = function() {
		deleteCalled = true;
		realDelete();
	};

	event.updateRelTime();

	t.true(deleteCalled, 'deleteSelf should be called for events more than 30s in the past');
	t.true(event.getField('passed'), 'passed should be true for events more than 30s in the past');
	t.false(getDataCalled, 'getData should NOT be called for past events (lazy eval guards the expensive path)');
});

test('updateRelTime: future event is not deleted', t => {
	const event = makeEvent();
	event.setField('time', new Date(Date.now() + 300000).toISOString()); // 5 min ahead

	let deleteCalled = false;
	const realDelete = event.deleteSelf.bind(event);
	event.deleteSelf = function() { deleteCalled = true; realDelete(); };

	event.updateRelTime();

	t.false(deleteCalled, 'deleteSelf should not be called for future events');
	t.false(event.getField('passed'), 'passed should be false for future events');
});

test('updateRelTime: recent past event (within 30s) is not deleted', t => {
	const event = makeEvent();
	event.setField('time', new Date(Date.now() - 10000).toISOString()); // 10s ago

	let deleteCalled = false;
	const realDelete = event.deleteSelf.bind(event);
	event.deleteSelf = function() { deleteCalled = true; realDelete(); };

	event.updateRelTime();

	t.false(deleteCalled, 'deleteSelf should not be called for events within 30s of passing');
	t.false(event.getField('passed'), 'passed should be false within 30s window');
});

test('updateRelTime: threshold crossing does not evaluate getData (lazy arg)', t => {
	const event = makeEvent();
	// Time is 15s from now, so secondsTo ≈ 15
	event.setField('time', new Date(Date.now() + 15000).toISOString());
	// Fake oldSecondsTo = 40, so the 30s threshold will be crossed this tick
	event.setField('secondsTo', 40);

	let getDataCalled = false;
	event.getData = function() {
		getDataCalled = true;
		return {};
	};

	event.updateRelTime();

	t.false(getDataCalled, 'getData should NOT be evaluated when passed as a lazy thunk to clientBroadcast');
});
