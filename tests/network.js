import test from 'ava';
const Network = require("../src/classes/network");

test('Create Network', test => {
	var network = new Network('id123');
	test.is(network.getCode(), 'id123');
	test.is(network.getSymbol(), false);
	test.is(network.getCssClass(), 'network_id123');
});