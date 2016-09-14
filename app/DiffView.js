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
		let oldmode = this.model.get("oldmode");
		let newmode = this.model.get("newmode");
		let status = this.model.get('status');
		let binary = this.model.get('binary');
		let hunks = this.model.get('hunks');
		let file = newFile || oldFile;

		// Figure out the lines in the diff and if this is a large diff.
		let large = false, lines = 0;
		if (!this.showlarge) {
			for (let i = 0; hunks && i < hunks.length; i += 1) {
				lines += hunks[i].lines.length;
			}
			large = (hunks && hunks.length > 100) || lines > (status === 'D' || status === 'A' ? 25 : 150);
		}

		// setup the record for rendering
		let r = { file, large, lines, status, msgs: [], loading: !binary && !hunks };
		if (hunks && !large)
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
