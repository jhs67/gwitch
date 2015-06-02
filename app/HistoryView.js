"use strict";

var Backbone = require("backbone");
var historyHbs = require('./history.hbs');

var HistoryView = Backbone.View.extend({
	className: 'history-view',

	initialize: function() {
		this.listenTo(this.collection, "all", this.render);
		this.render();
	},

	record: function() {
		return {
			commits: this.collection.map(function(c) {
				var commit = c.get('commit');
				return {
					graph: c.get('graph').map(function(g) { return { glyph: g }; }),
					message: commit.message().substr(0, 80),
					author: commit.author(),
					index: c.get("index"),
				};
			}),
		};
	},

	render: function() {
		this.$el.html(historyHbs(this.record()));
		return this;
	}
});
module.exports = HistoryView;
