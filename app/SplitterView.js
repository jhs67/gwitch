
var $ = require('jquery');
var Backbone = require("backbone");
var app = require('./app');

let moveEvents = [ 'mousemove', 'touchmove' ];
let upEvents = [ 'mouseup', 'touchend', 'touchleave', 'touchcancel' ];

var SplitterView = Backbone.View.extend({
	className: "splitter-view",

	initialize: function(opts) {
		this.top = opts.top || $("<div/>");
		this.bottom = opts.bottom || $("<div/>");
		this.bar = $('<div class="splitter-bar"><div class="splitter-dot"/></div>');
		this.key = opts.key;

		this.top.addClass("splitter-top");
		this.bottom.addClass("splitter-bottom");
		this.$el.append(this.top);
		this.$el.append(this.bar);
		this.$el.append(this.bottom);

		this.loadSize();
		this.listenTo(app.windowLayout, "change:" + this.key, this.loadSize);
	},

	loadSize: function() {
		this.height = parseFloat(app.windowLayout.get(this.key));
		if (isNaN(this.height) || this.height < 10 || this.height > 80)
			this.height = 25;
		this.setSize();
	},

	setSize: function() {
		this.bottom.css("height", (this.height * this.$el.height() / 100) + "px");
	},

	events: {
		'mousedown .splitter-bar': 'mouseDown',
	},

	mouseDown: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();
		let outerHeight = this.$el.height();
		let hpx = this.height * outerHeight / 100;
		this.dragoff = hpx + ev.clientY;

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

		app.windowLayout.set(this.key, this.height);
		app.windowLayout.save();
	},

	mouseMove: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();

		var outerHeight = this.$el.height();
		let hpx = this.dragoff - ev.clientY;
		var height = 100.0 * hpx / outerHeight;
		height = Math.max(10, height);
		height = Math.min(80, height);
		this.height = height;
		this.setSize();
	},

	remove: function() {
		this.top.remove();
		this.bottom.remove();
		Backbone.View.prototype.remove.apply(this, arguments);
	},
});

module.exports = SplitterView;
