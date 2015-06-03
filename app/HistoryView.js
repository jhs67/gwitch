"use strict";

var moment = require("moment");
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
					message: commit.summary(),
					author: commit.author().name(),
					index: c.get("index"),
					shortHash: c.id.substr(0, 7),
					date: moment(commit.date()).format('LLL'),
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
