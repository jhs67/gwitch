"use strict";

var Backbone = require("backbone");
var refsHbs = require('./refs.hbs');

var RefsView = Backbone.View.extend({
	className: 'refs-view',

	initialize: function() {
		return this.render();
	},

	record: function() {
		return { title: "tucheze" };
	},

	render: function(mode, f) {
		this.$el.html(refsHbs(this.record()));
	},
});
module.exports = RefsView;
