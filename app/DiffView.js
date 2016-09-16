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
		return this.render();
	},

	clickLargeDiff: function(ev) {
		this.model.set('show', true);
		this.render();
	},

	render: function() {
		let oldFile = this.model.get("oldFile");
		let newFile = this.model.get("newFile");
		let oldmode = this.model.get("oldmode");
		let newmode = this.model.get("newmode");
		let status = this.model.get('status');
		let binary = this.model.get('binary');
		let hunks = this.model.get('hunks');
		let lines = this.model.get('lines');
		let show = this.model.show();
		let file = this.model.path();

		// setup the record for rendering
		let r = { file, show, lines, status, msgs: [], loading: !binary && !hunks };
		if (show && hunks)
			r.hunks = DiffView.mapHunks(hunks);

		// add any additional info about the commit
		if (status === 'A') {
			if (newmode)
				r.msgs.push({ msg: "new file mode " + newmode });
			else
				r.msgs.push({ msg: "new file" });
		}
		if (status === 'D') {
			if (oldmode)
				r.msgs.push({ msg: "delete file mode " + oldmode });
			else
				r.msgs.push({ msg: "delete file" });
		}
		if (status === 'C')
			r.msgs.push({ msg: "copy file from " + oldFile + " to " + newFile });
		if (status === 'R')
			r.msgs.push({ msg: "rename file from " + oldFile + " to " + newFile });
		if (status !== 'A' && status !== 'D' && newmode != oldmode)
			r.msgs.push({ msg: "mode change from " + oldmode + " to " + newmode });
		if (binary)
			r.msgs.push({ msg: "binary files differ" });

		// render the template and set my id
		this.$el.html(patchHbs(r));
		this.$el.attr('id', pathToId(file));

		return this;
	},
});

var DiffView = Backbone.View.extend({
	className: 'diff-view',

	initialize: function(opt) {
		this.map = {};
		this.listenTo(this.collection, "add remove update reset sort", this.render);
		return this.render();
	},

	records: function() {
		return this.collection;
	},

	render: function() {
		this.$el.html(diffHbs({}));
		let patches = this.$('.patches');

		let r = this.records(), map = {};
		r.forEach(p => {
			let v = new PatchView({ model: p });
			map[p.path()] = v;
			patches.append(v.$el);
			return v;
		});
		this.map = map;
		return this;
	}
});
module.exports = DiffView;

DiffView.mapHunks = function(hunks) {
	if (!hunks) return hunks;
	return hunks.map(function(hunk, hi) {
		return {
			header: hunk.header,
			lines: hunk.lines.map(function(line, li) {
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
					id: 'h' + hi + 'l' + li,
				};
			}),
		};
	});
};
