"use strict";

var Backbone = require("backbone");
var diffHbs = require('./diff.hbs');
var pathToId = require('./pathToId');

var DiffView = Backbone.View.extend({
	className: 'diff-view',

	initialize: function() {
		this.listenTo(this.collection, "all", this.render);
		return this.render();
	},

	record: function() {
		return {
			patches: this.collection.map(function(r) {
				let patch = r.get("patch");
				return DiffView.patchRecord(patch);
			}),
		};
	},

	render: function() {
		this.$el.html(diffHbs(this.record()));
		return this;
	}
});
module.exports = DiffView;

DiffView.patchRecord = function(patch) {
	let oldFile = patch.oldFile;
	let newFile = patch.newFile;
	let file = newFile || oldFile;
	return {
		file: file,
		newFile: newFile,
		id: pathToId(file),
		hunks: patch.hunks.map(function(hunk) {
			return {
				header: hunk.header,
				lines: hunk.lines.map(function(line) {
					var classes = [];
					if (line.origin === "+")
						classes.push('new');
					if (line.origin === "-")
						classes.push('old');
					return {
						origin: line.origin,
						content: line.content,
						classes: classes.join(' '),
						oldLineno: line.oldLineno < 0 ? "" : line.oldLineno,
						newLineno: line.newLineno < 0 ? "" : line.newLineno,
					};
				}),
			};
		}),
	};
};
