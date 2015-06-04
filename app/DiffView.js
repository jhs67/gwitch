"use strict";

var Backbone = require("backbone");
var diffHbs = require('./diff.hbs');

var DiffsView = Backbone.View.extend({
	className: 'diff-view',

	initialize: function() {
		this.listenTo(this.collection, "all", this.render);
		this.render();
	},

	record: function() {
		return {
			patches: this.collection.map(function(r) {
				let patch = r.get("patch");
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
module.exports = DiffsView;
