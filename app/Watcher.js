"use strict";

var fs = require('fs');

module.exports = Watcher;
function Watcher(handler) {
	this.files = new Map();
	this.handler = handler;
}

Watcher.prototype.add = function(p) {
	let watcher = this;
	if (watcher.files.has(p))
		return;
	return setWatch();

	function setWatch() {
		try {
			console.log("watch " + p);
			watcher.files.set(p, fs.watch(p, { persistent: false }, function(type, path) {
				watcher.handler(type, p, path);
				if (type === 'rename') {
					watcher.files.get(p).close();
					setWatch();
				}
			}));
			return true;
		}
		catch(e) {
			return false;
		}
	}
};

Watcher.prototype.close = function() {
	let watcher = this;
	watcher.files.forEach(function(f) { f.close(); });
	watcher.files.clear();
};
