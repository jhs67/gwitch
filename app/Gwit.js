
let child_process = require('child_process');

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
	return this.gitRc("show-ref", "--head").then(function(result) {
		if (result.code === 1)
			return [];
		if (result.code !== 0)
			return Promise.reject(new Error("unexpected git return value"));
		return result.out.substr(0, result.out.length - 1).split('\n').map(function(line) {
			let split = line.indexOf(' ');
			let hash = line.substr(0, split);
			let refName = line.substr(split + 1);
			if (refName === "HEAD") {
				return {
					hash,
					refName,
					type: "HEAD",
					name: "HEAD",
				};
			}

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
	}).then(result => {
		return this.git("stash", "list", "--format=%H").then(output => {
			let stashlist = output.split('\n');
			stashlist.shift();
			stashlist.pop();
			stashlist.forEach((hash, i) => {
				result.push({
					hash: hash,
					refName: `stash@{${i + 1}}`,
					name: `stash@{${i + 1}}`,
					type: 'stash',
				});
			});
			return result;
		});
	});
};

Gwit.prototype.head = function() {
	return this.gitRc("symbolic-ref", "HEAD").then(function(res) {
		if (res.code !== 0)
			return null;
		return res.out.trim();
	});
};

Gwit.prototype.lookupRef = function(ref) {
	return this.git("rev-list", "-n1", ref).then(function(out) {
		return out.trim();
	});
};

let LogFields = {
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
	if (heads.length === 0)
		return Promise.resolve([]);
	return this.git("log", LogFormat, heads).then(function(out) {
		return out.substr(0, out.length - 1).split("\x1e").map(function(record) {
			let v = record.trim().split('\x1f'), r = {};
			LogKeys.forEach(function(k, i) { r[k] = v[i]; });
			r.authorStamp = parseFloat(r.authorStamp);
			r.parents = (r.parents && r.parents.split(' ')) || [];
			return r;
		});
	});
};

function isDiffLine(c) {
	return c === ' ' || c === '-' || c === '+' || c === '\\';
}

function diffEHeader(l, m) {
	if (l.startsWith(m))
		return l.substr(m.length);
}

function unEscapePath(v) {
	if (v[0] !== '"')
		return v;
	let r = "", i = 1;
	while (i < v.length + 1) {
		let e = v.indexOf('/', i);
		if (e === i) {
			i += 1;
			if (v[i] === 't')
				r += '\t';
			else if (v[i] === 'n')
				r += '\n';
			else
				r += v[i];
			i += 1;
		}
		else if (e === -1) {
			r += v.substr(i, v.length - 1 - i);
			break;
		}
		else {
			r += v.substr(i, e - v);
			i = e;
		}
	}
}

function parseDiff(diff, defaults) {
	defaults = defaults || {};
	let ret = { patches: [] };
	let lines = diff.split('\n'), i = 0;
	lines.pop();
	while (i < lines.length) {
		let d = lines[i++];
		if (!d.startsWith("diff --git"))
			throw new Error("invalid diff line: " + d);

		let binary = false, empty = false, status = defaults.status || 'M';
		let oldmode, newmode, from, to;
		while (i < lines.length) {
			let w = lines[i], v;
			if ((v = diffEHeader(w, "--- "))) {
				if (!from) {
					from = unEscapePath(v);
					if (from === "/dev/null") {
						from = null;
					}
					else if (from.startsWith('a/')) {
						from = from.substr(2);
					}
					else {
						throw new Error("unexpected from path in diff: " + w);
					}
				}

				i += 1;
				w = lines[i];
				v = diffEHeader(w, "+++ ");
				if (!v) {
					throw new Error("expected +++ diff header line: " + w);
				}
				if (!to) {
					to = unEscapePath(v);
					if (to === "/dev/null") {
						to = null;
					}
					else if (to.startsWith('b/')) {
						to = to.substr(2);
					}
					else {
						throw new Error("unexpected to path in diff: " + w);
					}
				}

				i += 1;
				break;
			}
			else if ((v = diffEHeader(w, "Binary files "))) {
				let m = v.match(/(.*) and (.*) differ/);
				if (!m) {
					throw new Error("unexpected binary diff message: " + w);
				}

				if (!from) {
					from = unEscapePath(m[1]);
					if (from === "/dev/null") {
						from = null;
					}
					else if (from.startsWith('a/')) {
						from = from.substr(2);
					}
					else {
						throw new Error("unexpected from path in diff: " + w);
					}
				}

				if (!to) {
					to = unEscapePath(m[2]);
					if (to === "/dev/null") {
						to = null;
					}
					else if (to.startsWith('b/')) {
						to = to.substr(2);
					}
					else {
						throw new Error("unexpected to path in diff: " + w);
					}
				}

				binary = true;
				i += 1;
				break;
			}
			else if ((v = diffEHeader(w, "diff --git "))) {
				empty = true;
				break;
			}
			else if ((v = diffEHeader(w, "old mode "))) {
				oldmode = v;
			}
			else if ((v = diffEHeader(w, "deleted file mode "))) {
				status = 'D';
				oldmode = v;
			}
			else if ((v = diffEHeader(w, "new mode "))) {
				newmode = v;
			}
			else if ((v = diffEHeader(w, "new file mode "))) {
				status = 'A';
				newmode = v;
			}
			else if ((v = diffEHeader(w, "copy from "))) {
				status = 'C';
				from = unEscapePath(v);
			}
			else if ((v = diffEHeader(w, "rename from "))) {
				status = 'R';
				from = unEscapePath(v);
			}
			else if ((v = diffEHeader(w, "copy to "))) {
				status = 'C';
				to = unEscapePath(v);
			}
			else if ((v = diffEHeader(w, "rename to "))) {
				status = 'R';
				to = unEscapePath(v);
			}
			else if ((v = diffEHeader(w, "index "))) {
				let m = v.match("[0-9a-fA-F]*...[0-9a-fA-F]*\( ([0-7]*)\)?");
				if (!m) {
					throw new Error("unexected index header: " + w);
				}
				if (m[1]) {
					oldmode = newmode = m[1];
				}
			}
			else if (!diffEHeader(w, "similarity index ") && !diffEHeader(w, "similarity index ")) {
				throw new Error("unrecognized git extended header line: " + w);
			}
			i += 1;
		}

		if (!from && !to) {
			let m = d.match(/diff --git a\/(.*) b\/\1/);
			if (m) {
				to = m[1];
			}
			else {
				m = d.match(/diff --git a\/(.*) b\/(.*)/);
				from = m[1];
				to = m[2];
			}
		}

		let patch = {
			status: status,
			oldmode: oldmode,
			newmode: newmode,
			oldFile: from,
			newFile: to,
		};

		if (binary) {
			patch.binary = true;
			patch.hunks = [];
		}
		else if (empty) {
			patch.hunks = [];
		}
		else {
			patch.hunks = [];

			while (i < lines.length) {
				let l = lines[i++];
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
						oldLineno: l[0] !== '\\' && l[0] !== '+' ? oldLineno++ : -1,
						newLineno: l[0] !== '\\' && l[0] !== '-' ? newLineno++ : -1,
					};

					hunk.lines.push(line);
				}

				patch.hunks.push(hunk);

				if (i === lines.length || lines[i][0] !== '@')
					break;
			}
		}

		ret.patches.push(patch);
	}

	return ret;
}

Gwit.prototype.diffCommits = function(from, to) {
	return this.git("diff", "-M50", "-C50", from, to).then(function(out) {
		return parseDiff(out);
	});
};

Gwit.prototype.diffCommitFile = function(from, to, record) {
	if (!from) from = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
	let file = record.newFile || record.oldFile;
	let old = record.oldFile;
	return (old && old !== file ? this.git("diff", from + ":" + old, to + ":" + file)
			: this.git("diff", from, to, "--", file)).then(function(out) {
		return parseDiff(out, record);
	});
};

Gwit.prototype.diffIndexToWorkdir = function() {
	return this.git("diff", "-M50", "-C50").then(function(out) {
		return parseDiff(out);
	});
};

Gwit.prototype.diffHeadToIndex = function() {
	return this.git("diff", "-M50", "-C50", "--cached").then(function(out) {
		return parseDiff(out);
	});
};

function parseNameStatus(out) {
	let lines = out.split('\n');
	lines.splice(-1, 1);
	return lines.map(line => {
		let r = line.split('\t');
		let status = r[0], similarity;
		if (status.length > 1) {
			similarity = parseInt(status.substr(1));
			status = status[0];
		}
		let oldFile = r[1], newFile;
		if (r.length > 2) {
			oldFile = r[1];
			newFile = r[2];
		}
		return { newFile, oldFile, status, similarity };
	});
}

Gwit.prototype.amendStatus = function() {
	return this.git("diff", "-M50", "-C50", "--cached", "--name-status", "HEAD^").then(parseNameStatus);
};

Gwit.prototype.commitStatus = function(ref) {
	return this.git("show", "--name-status", "--format=", "-M50", "-C50", ref).then(parseNameStatus);
};

Gwit.prototype.amendMessage = function() {
	return this.git("show", "-s", "--format=%B", "HEAD").then(out => {
		out = out.substr(0, out.length - 1);
		if (out.indexOf('\n') == out.length - 1)
			out = out.substr(0, out.length - 1);
		return out;
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
	return this.git("diff", "-M50", "-C50", "--", file).then(function(out) {
		let d = parseDiff(out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.diffFileWorkingToHead = function(file) {
	return this.git("diff", "-M50", "-C50", "HEAD", "--", file).then(function(out) {
		let d = parseDiff(out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.diffFileIndexToAmend = function(file, from) {
	let args = from ? ["diff", "-M01", "-C50", "HEAD^", "--cached", "--", from, file ] :
		["diff", "-M50", "-C50", "HEAD^", "--cached", "--", file];
	return this.git(args).then(function(out) {
		let d = parseDiff(out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.diffFileIndexToHead = function(file, from) {
	let args = from ? ["diff", "-M50", "-C50", "-M01", "--cached", "--", from, file ] :
		["diff", "-M50", "-C50", "--cached", "--", file];
	return this.git(args).then(function(out) {
		let d = parseDiff(out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.diffFileUntracked = function(file) {
	return this.gitRc("diff", "-M50", "-C50", "--no-index", "--", "/dev/null", file).then(function(r) {
		let d = parseDiff(r.out);
		return d && d.patches && d.patches[0];
	});
};

Gwit.prototype.stageFiles = function(files) {
	return this.git("add", "--", files);
};

Gwit.prototype.unstageFiles = function(files) {
	return this.git("reset", "HEAD", "--", files);
};

Gwit.prototype.discardChanges = function(files) {
	return this.git("checkout", "--", files);
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

Gwit.prototype.amendCommit = function(message) {
	return this.git("commit", "--amend", "-m", message);
};
