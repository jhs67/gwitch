"use strict";

var $ = require('jquery');
var Backbone = require("backbone");

var path = require("path");
var NodeGit = require('nodegit');

require("handlebars");
var diffHbs = require('./diff.hbs');

function unwrap(o, a) {
	if (typeof a !== 'function')
		return a == o ? 'recursive' : a;
	try {
		let q = a.apply(o);
		return q == o ? 'recursive' : q;
	}
	catch (err) {
		return err.message;
	}
}

function dumpAny(any, pre) {
	pre = pre || '';
	var npre = pre + '  ';
	if (pre.length > 12)
		return any + '';

	if (Array.isArray(any))
		return '[\n' + any.map(function(i) { return npre + dumpAny(i, npre); }).join(",\n") + "\n" + pre +  "]";

	if (typeof any === 'function')
		return 'function';

	if (any === null)
		return 'null';

	if (any === undefined)
		return 'undefined';

	if (any instanceof NodeGit.Oid)
		return any.tostrS();

	if (typeof any !== 'object')
		return any + '';

	var r = {};
	Object.keys(any).forEach(function(k) {
		var isfunc = typeof any[k] === 'function';
		var ek = isfunc ? k + "()" : k;
		r[ek] = dumpAny(unwrap(any, any[k]), npre);
	});
	Object.keys(any.__proto__).forEach(function(k) {
		var isfunc = typeof any[k] === 'function';
		var ek = isfunc ? k + "()" : k;
		if (!(ek in r))
			r[ek] = dumpAny(unwrap(any, any[k]), npre);
	});
	var members = Object.keys(r).map(function(k) { return npre + k + ": " + r[k]; });
	return "{\n" + members.join(",\n") + "\n" + pre +  "}";
}

function dumpStatus(status) {
	try {
		console.log(dumpAny(status));
		return dumpAny(status);
//		console.log("status ", status, dumpAny(status.indexToWorkdir(), 3));
//		return status.status() + " - " + status.headToIndex() + " - " + status.indexToWorkdir() + "\n";
	}
	catch (err) {
		console.log("err2", err);

	}
}

var DiffView = Backbone.View.extend({
	className: 'diff-view',

	init: function() {
	},

	record: function() {
		return {
			patches: this.model.patches().map(function(patch) {
				return {
					oldFile: patch.oldFile().path(),
					newFile: patch.newFile().path(),
					hunks: patch.hunks().map(function(hunk) {
						return {
							header: hunk.header(),
							lines: hunk.lines().map(function(line) {
								var classes = [];
								if (line.origin() === 43)
									classes.push('new');
								if (line.origin() === 45)
									classes.push('old');
								return {
									origin: String.fromCharCode(line.origin()),
									content: line.content(),
									classes: classes.join(' '),
									oldLineno: line.oldLineno() < 0 ? "" : line.oldLineno(),
									newLineno: line.newLineno() < 0 ? "" : line.newLineno(),
								};
							}),
						};
					}),
				};
			}),
		};
	},

	render: function() {
		this.$el.html(diffHbs(this.record()));
		return this;
	}
});

var ClientView = Backbone.View.extend({
	initialize: function() {
		this.diff = new DiffView();
		this.$el.append(this.diff.el);
		return this.render();
	},

	render: function(mode, f) {
		var self = this;

		var g = path.dirname(__dirname);
		NodeGit.Repository.open(g).then(function(repo) {
			return NodeGit.Diff.indexToWorkdir(repo, null, null);
		}).then(function(diff) {
			self.diff.model = diff;
			self.diff.render();
		}, function(err) {
			console.log("haa...");
			self.$el.text(err.message);
		});
	}
});

addEventListener('load', function() {
	var c = new ClientView({});
	$('#container').append(c.$el);
});
