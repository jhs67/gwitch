
let fs = require('fs');
let path = require('path');
let async = require('async');

module.exports = walkTree;
function walkTree(root, filter) {

	let cancelled = false;
	let stat = new async.cargo(statWorker, 16384);
	let readdir = new async.queue(readdirWorker, 5);

	let r = new Promise(function(resolve, reject) {
		stat.drain = readdir.drain = function() {
			if (readdir.idle() && stat.idle()) {
				stat.drain = readdir.drain = function() {};
				resolve(null);
			}
		};
		stat.push({ root: root, path: "" });
	});

	function statWorker(tasks, callback) {
		Promise.all(tasks.map(function(task) {
			return getStat(path.join(task.root, task.path))
			.then(function(stat) {
				task.stat = stat;
			})
			.catch(function(err) {
				task.err = err;
			});
		}))
		.then(function() {
			if (cancelled) return;
			return filter(tasks.filter(function(task) { return task.stat; }));
		})
		.then(function(wanted) {
			if (cancelled) return;
			wanted = wanted.filter(function(task) { return task.stat.isDirectory(); });
			wanted.forEach(function(task) { readdir.push(task); });
		})
		.then(function() { callback(); })
		.catch(callback);
	}

	function readdirWorker(task, callback) {
		readDir(path.join(task.root, task.path))
		.then(function(files) {
			if (cancelled) return;
			stat.push(files.map(function(file) {
				return { root: task.root, path: path.join(task.path, file) };
			}));
		})
		.then(function() { callback(); })
		.catch(callback);
	}

	r.cancel = function() {
		cancelled = true;
		readdir.kill();
		stat.kill();
	};

	return r;
}

function getStat(file) {
	return new Promise(function(resolve, reject) {
		fs.lstat(file, function(err, stat) {
			if (err) return reject(err);
			return resolve(stat);
		});
	});
}

function readDir(file) {
	return new Promise(function(resolve, reject) {
		fs.readdir(file, function(err, files) {
			if (err) return reject(err);
			return resolve(files);
		});
	});
}
