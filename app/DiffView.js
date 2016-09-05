"use strict";

var Backbone = require("backbone");
var diffHbs = require('./diff.hbs');
var patchHbs = require('./patch.hbs');
var pathToId = require('./pathToId');

let PatchView = Backbone.View.extend({
	className: 'patch',

	events: {
		"click .large-diff": "clickLargeDiff",
	},

	initialize: function(opts) {
		this.listenTo(this.model, "all", this.render);
		this.showlarge = opts && opts.showlarge;
		return this.render();
	},

	clickLargeDiff: function(ev) {
		this.showlarge = true;
		this.render();
	},

	render: function() {
		let oldFile = this.model.get("oldFile");
		let newFile = this.model.get("newFile");
		let hunks = this.model.get('hunks');
		let file = newFile || oldFile;
		let r = {
			file: file,
			newFile: newFile,
			status: this.model.get("status"),
			id: pathToId(file),
		};

		let large = false, lines = 0;
		if (!this.showlarge) {
			large = hunks && hunks.length > 100;
			for (let i = 0; hunks && i < hunks.length; i += 1) {
				lines += hunks[i].lines.length;
				large = lines > 150 || (r.status === 'A' && lines > 25);
			}
		}

		r.large = large;
		r.lines = lines;
		if (hunks && !large)
			r.hunks = DiffView.mapHunks(hunks);

		this.$el.html(patchHbs(r));
		this.$el.attr('id', r.id);

		return this;
	},
});

var DiffView = Backbone.View.extend({
	className: 'diff-view',

	initialize: function(opt) {
		this.showlarge = opt && opt.showlarge;
		this.listenTo(this.collection, "add remove update reset sort", this.render);
		return this.render();
	},

	records: function() {
		return this.collection;
	},

	render: function() {
		let r = this.records();
		this.$el.html(diffHbs({}));
		let p = this.$('.patches');
		r.forEach(patch => { p.append(new PatchView({ showlarge: this.showlarge, model: patch }).$el); });
		return this;
	}
});
module.exports = DiffView;

DiffView.mapHunks = function(hunks) {
	if (!hunks) return hunks;
	return hunks.map(function(hunk) {
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
	});
};
