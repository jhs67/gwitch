"use strict";

var $ = require('jquery');
var Backbone = require("backbone");

let moveEvents = [ 'mousemove', 'touchmove' ];
let upEvents = [ 'mouseup', 'touchend', 'touchleave', 'touchcancel' ];

var SplitterView = Backbone.View.extend({
	className: "splitter-view",

	initialize: function(opts) {
		this.top = opts.top || $("<div/>");
		this.bottom = opts.bottom || $("<div/>");
		this.bar = $('<div class="splitter-bar"><div class="splitter-dot"/></div>');

		this.height = 200;

		this.top.addClass("splitter-top");
		this.bottom.addClass("splitter-bottom");
		this.bottom.css("height", this.height + "px");
		this.$el.append(this.top);
		this.$el.append(this.bar);
		this.$el.append(this.bottom);
	},

	events: {
		'mousedown .splitter-bar': 'mouseDown',
	},

	mouseDown: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();
		this.dragoff = this.height + ev.clientY;

		$(document.documentElement)
		.bind(upEvents.map(function(v) { return v + '.splitter'; }).join(' '), this.mouseUp.bind(this))
		.bind(moveEvents.map(function(v) { return v + '.splitter'; }).join(' '), this.mouseMove.bind(this));

		this.bar.addClass("dragged");
		$(document.documentElement).css("cursor", "row-resize");
	},

	mouseUp: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();

		var doce = $(document.documentElement);
		upEvents.forEach(function(v) { doce.unbind(v + '.splitter'); });
		moveEvents.forEach(function(v) { doce.unbind(v + '.splitter'); });

		this.bar.removeClass("dragged");
		$(document.documentElement).css("cursor", "");
	},

	mouseMove: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();

		var height = this.dragoff - ev.clientY;
		var outerHeight = this.$el.height();
		height = Math.max(outerHeight * 0.1, height);
		height = Math.min(outerHeight * 0.8, height);
		this.height = height;
		this.bottom.css("height", this.height + "px");
	},

	remove: function() {
		this.top.remove();
		this.bottom.remove();
		Backbone.View.prototype.remove.apply(this, arguments);
	},
});

module.exports = SplitterView;
