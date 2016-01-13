"use strict";

let child_process = require('child_process');
let path = require('path');

module.exports = Gwit;
function Gwit() {
}

Gwit.open = function(repodir) {
	let gwit = new Gwit();
	gwit.repodir = repodir;
	return new Promise(function(resolve, reject) {
		if (gwit.cmd) return resolve();
		child_process.exec("which git", function(err, out) {
			if (err) return reject(err);
			gwit.cmd = out.trim();
			resolve();
		});
	}).then(function() {
		return gwit.git("rev-parse", "--show-toplevel").then(function(top) {
			gwit.repodir = top.trim();
			return gwit;
		});
	});
};

Gwit.prototype.git = function() {
	let gwit = this;
	let args = [].concat.apply([], arguments);
	let opts = { cwd: gwit.repodir, maxBuffer: 200 * 1024 * 1024 };
	return new Promise(function(resolve, reject) {
		child_process.execFile(gwit.cmd, args, opts, function(err, out) {
			if (err) return reject(err);
			resolve(out);
		});
	});
};

Gwit.prototype.gitInput = function() {
	let gwit = this;
	let args = [].concat.apply([], arguments);
	let input = args.shift();
	let opts = { cwd: gwit.repodir, maxBuffer: 200 * 1024 * 1024 };
	return new Promise(function(resolve, reject) {
		let child = child_process.execFile(gwit.cmd, args, opts, function(err, out) {
			if (err) return reject(err);
			resolve(out);
		});
		child.stdin.end(input);
	});
};

Gwit.prototype.gitRc = function() {
	let gwit = this;
	let args = [].concat.apply([], arguments);
	let opts = { cwd: gwit.repodir, maxBuffer: 200 * 1024 * 1024 };
	return new Promise(function(resolve, reject) {
		child_process.execFile(gwit.cmd, args, opts, function(err, out, stderr) {
			if (err && typeof err.code !== 'number') return reject(err);
			resolve({ code: (err && err.code) || 0, out: out });
		});
	});
};

Gwit.prototype.getRefs = function() {
	return this.git("show-ref").then(function(refout) {
		return refout.substr(0, refout.length - 1).split('\n').map(function(line) {
			let split = line.indexOf(' ');
			let hash = line.substr(0, split);
			let refName = line.substr(split + 1);
			let names = refName.split('/');
			let type = (names.shift(), names.shift());
			let name = names.join('/');
			if (!name) name = type;
			return {
				hash: hash,
				refName: refName,
				type: type,
				name: name,
			};
		});
	});
};

Gwit.prototype.head = function() {
	return this.git("symbolic-ref", "HEAD").then(function(out) {
		return out.trim();
	});
};

Gwit.prototype.lookupRef = function(ref) {
	return this.git("rev-parse", ref).then(function(out) {
		return out.trim();
	});
};

const LogFields = {
	hash: "%H",
	tree: "%T",
	authorName: "%an",
	authorEmail: "%ae",
	authorStamp: "%at",
	parents: "%P",
	subject: "%s",
	body: "%b",
};

let LogKeys = Object.keys(LogFields);
let LogFormat = "--pretty=format:" + LogKeys.map(function(k) { return LogFields[k]; }).join('%x1f') + '%x1e';

Gwit.prototype.log = function(heads) {
	return this.git("log", LogFormat, heads).then(function(out) {
		return out.substr(0, out.length - 1).split("\x1e").map(function(record) {
			let v = record.trim().split('\x1f'), r = {};
			LogKeys.forEach(function(k, i) { r[k] = v[i]; });
			r.parents = (r.parents && r.parents.split(' ')) || [];
			return r;
		});
	});
};

function isDiffLine(c) {
	return c === ' ' || c === '-' || c === '+';
}

function parseDiff(diff)  {
	let ret = { patches: [] };
	let lines = diff.split('\n'), i = 0;
	while (i < lines.length) {
		let l = lines[i++];
		if (!l.startsWith('---'))
			continue;
		let r = lines[i++];
		if (!r.startsWith('+++'))
			continue;

		let src = l.substr(3).trim();
		let dst = r.substr(3).trim();

		if (src.startsWith('a/'))
			src = src.substr(2);
		if (dst.startsWith('b/'))
			dst = dst.substr(2);

		if (src === "/dev/null")
			src = null;
		if (dst === "/dev/null")
			dst = null;

		let patch = {
			oldFile: src,
			newFile: dst,
			hunks: [],
		};

		while (i < lines.length) {
			l = lines[i++];
			let m = l.match(/(@@\s*-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s*@@.*)/);
			if (!m) throw new Error("invalid hunk header: " + l);
			let hunk = {
				header: m[1],
				oldStart: parseInt(m[2]),
				oldCount: m[3] ? parseInt(m[3]) : 0,
				newStart: parseInt(m[4]),
				newCount: m[5] ? parseInt(m[5]) : 0,
				lines: [],
			};

			let oldLineno = hunk.oldStart;
			let newLineno = hunk.newStart;
			while (i < lines.length) {
				if (!isDiffLine(lines[i][0]))
					break;
				l = lines[i++];
				let line = {
					origin: l[0],
					content: l.substr(1),
					oldLineno: l[0] !== '+' ? oldLineno++ : -1,
					newLineno: l[0] !== '-' ? newLineno++ : -1,
				};

				hunk.lines.push(line);
			}

			patch.hunks.push(hunk);

			if (lines[i][0] !== '@')
				break;
		}

		ret.patches.push(patch);
	}

	return ret;
}

Gwit.prototype.diffCommits = function(from, to) {
	return this.git("diff", from, to).then(function(out) {
		return parseDiff(out);
	});
};

Gwit.prototype.diffIndexToWorkdir = function() {
	return this.git("diff").then(function(out) {
		return parseDiff(out);
	});
};

Gwit.prototype.diffHeadToIndex = function() {
	return this.git("diff", "--cached").then(function(out) {
		return parseDiff(out);
	});
};

Gwit.prototype.isIgnored = function(path) {
	return this.gitRc("check-ignore", path).then(function(res) {
		return res.code === 0;
	});
};

Gwit.prototype.getIgnored = function(paths) {
	return this.gitRc("check-ignore", paths).then(function(res) {
		return res.out ? res.out.substr(0, res.out.length - 1).split('\n') : [];
	});
};

Gwit.prototype.getGitDir = function() {
	return this.git("rev-parse", "--git-dir").then(function(out) {
		return out.trim();
	});
};

Gwit.prototype.getSubmodules = function() {
	return this.git("submodule", "status").then(function(out) {
		let subs = [];
		out.split('\n').forEach(function(subline) {
			let match = subline.match(/([ +-U])([a-fA-F0-9]*) ([^ ]*) \(([^)]*)\)/);
			if (match) subs.push({ path: match[3], hash: match[2], status: match[1] });
		});
		return subs;
	});
};

Gwit.prototype.getIndexFiles = function() {
	return this.git("ls-files", "-z").then(function(out) {
		if (!out) return [];
		return out.substr(0, out.length - 1).split('\x00');
	});
};

function isUnmerged(indexStatus, workingStatus) {
	if (indexStatus === "U" || workingStatus === "U")
		return true;
	if (indexStatus === "D" && workingStatus === "D")
		return true;
	if (indexStatus === "A" && workingStatus === "A")
		return true;
	return false;
}

function statusLine(line, next) {
	return {
		indexStatus : line[0],
		workingStatus : line[1],
		path : line.substr(3),
		unmerged: isUnmerged(line[0], line[1]),
		fromPath: line[0] === "R" ? next : undefined,
	};
}

Gwit.prototype.getStatus = function() {
	return this.git("status", "-z").then(function(out) {
		let entries = [];
		if (!out) return entries;

		out = out.substr(0, out.length - 1).split('\x00');
		while (out.length > 0) {
			let line = out.shift();
			let e = statusLine(line, out[0]);
			if (e.indexStatus === 'R')
				out.shift();
			entries.push(e);
		}

		return entries;
	});
};

Gwit.prototype.diffFileWorkingToIndex = function(file) {
	return this.git("diff", "--", file).then(function(out) {
		let d = parseDiff(out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.diffFileWorkingToHead = function(file) {
	return this.git("diff", "HEAD", "--", file).then(function(out) {
		let d = parseDiff(out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.diffFileIndexToHead = function(file, from) {
	let args = from ? ["diff", "HEAD", "-M01", "--cached", "--", from, file ] : ["diff", "HEAD", "--cached", "--", file];
	return this.git(args).then(function(out) {
		let d = parseDiff(out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.diffFileUntracked = function(file) {
	return this.gitRc("diff", "--no-index", "--", "/dev/null", file).then(function(r) {
		let d = parseDiff(r.out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.stageFile = function(file) {
	return this.git("add", "--", file);
};

Gwit.prototype.unstageFile = function(file) {
	return this.git("reset", "HEAD", "--", file);
};

Gwit.prototype.discardChanges = function(file) {
	return this.git("checkout", "--", file);
};

Gwit.prototype.stagePatch = function(patch, reverse) {
	if (reverse)
		return this.gitInput(patch, "apply", "--cached", "--reverse");
	return this.gitInput(patch, "apply", "--cached");
};

Gwit.prototype.addIntent = function(file) {
	return this.git("add", "--intent-to-add", "--", file);
};

Gwit.prototype.commit = function(message) {
	return this.git("commit", "-m", message);
};
