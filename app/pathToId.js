"use strict";
var punycode = require('punycode');

module.exports = pathToId;
function pathToId(path) {
	return 'i' + punycode.encode(path.replace(/[^\w\-x]/g, function(a) {
		return a === 'x' ? 'xx' : 'x' + a.charCodeAt(0).toString(16) + '-';
	}));
}
