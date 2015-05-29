"use strict";

var Backbone = require("backbone");
var refsHbs = require('./refs.hbs');
var app = require('./app');

var RefsView = Backbone.View.extend({
	className: 'refs-view',

	initialize: function() {
		this.listenTo(app.workingCopy, "all", this.invalidate);
		this.listenTo(app.branches, "all", this.invalidate);
		return this.render();
	},

	invalidate: function() {
		var self = this;
		if (self.timeout) return;
		self.timeout = setTimeout(function() { self.timeout = null; self.render(); }, 100);
	},

	record: function() {
		return {
			title: app.workingCopy.get("name"),
			branches: app.branches.toJSON().map(function(r) { r.selected = app.workingCopy.get('head'); return r; }),
		};
	},

	render: function(mode, f) {
		this.$el.html(refsHbs(this.record()));
	},
});
module.exports = RefsView;
