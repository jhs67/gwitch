"use strict";
var punycode = require('punycode');

module.exports = pathToId;
function pathToId(path) {
	return 'i' + punycode.encode(path.replace(/[^\w\-x]/g, function(a) {
		return a === 'x' ? 'xx' : 'x' + a.charCodeAt(0).toString(16) + '-';
	}));
}

pathToId.invert = function(id) {
	return punycode.decode(id.substr(1)).replace(/x(x|[\da-fA-F]*)-/g, function(a, b) {
		return b === 'x' ? 'x' : String.fromCharCode(parseInt(b, 16));
	});
};
