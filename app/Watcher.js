"use strict";

var fs = require('fs');

var withStat = process.platform === 'darwin';

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
			var w = fs.watch(p, { persistent: false }, function(type, path) {
				if (withStat && w.initial_stat && type === 'change') {
					fs.stat(p, function(err, s) {
						if (!err && w.initial_stat.mtime.getTime() === s.mtime.getTime())
							return;
						w.initial_stat = s;
						watcher.handler(type, p, path);
					});
				}
				else {
					watcher.handler(type, p, path);
				}

				if (type === 'rename') {
					watcher.files.get(p).close();
					setWatch();
				}
			});

			if (withStat) {
				fs.stat(p, function(err, s) {
					if (err) return;
					w.initial_stat = s;
				});
			}

			watcher.files.set(p, w);
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
