"use strict";

let $ = require('jquery');
let Backbone = require("backbone");

let WorkingFilesView = Backbone.View.extend({
	className: 'working-files',

	initialize: function() {
		this.$el.html("working files");
	},
});

let CommitMessageView = Backbone.View.extend({
	className: 'commit-message',

	initialize: function() {
		this.$el.html("commit message");
	},
});

let IndexFilesView = Backbone.View.extend({
	className: 'index-files',

	initialize: function() {
		this.$el.html("staged files");
	},
});

let moveEvents = [ 'mousemove', 'touchmove' ];
let upEvents = [ 'mouseup', 'touchend', 'touchleave', 'touchcancel' ];

let IndexView = Backbone.View.extend({
	className: 'index-view',

	initialize: function() {
		this.working = new WorkingFilesView();
		this.lbar = $('<div class="hsplitter-bar"><div class="gap"/><div class="splitter-dot"/><div class="gap"/></div>');
		this.commit = new CommitMessageView();
		this.rbar = $('<div class="hsplitter-bar"><div class="gap"/><div class="splitter-dot"/><div class="gap"/></div>');
		this.index = new IndexFilesView();

		this.dragSize = [ 24, 24 ];
		this.dragSign = [ +1, -1 ];
		this.dragBars = [ this.lbar, this.rbar ];
		this.dragSides = [ this.working, this.index ];
		this.dragSides[0].$el.css("width", this.dragSize[0] + "%");
		this.dragSides[1].$el.css("width", this.dragSize[1] + "%");
		this.dragIndex = -1;

		this.$el.append(this.working.$el);
		this.$el.append(this.lbar);
		this.$el.append(this.commit.$el);
		this.$el.append(this.rbar);
		this.$el.append(this.index.$el);
	},

	events: {
		'mousedown .hsplitter-bar': 'mouseDown',
	},

	mouseDown: function(ev) {
		if (this.dragIndex !== -1)
			this.endDrag();

		this.dragIndex = ev.currentTarget === this.lbar[0] ? 0 : 1;
		this.dragoff = this.dragSides[this.dragIndex].el.offsetWidth - this.dragSign[this.dragIndex] * ev.clientX;

		$(document.documentElement)
		.bind(upEvents.map(function(v) { return v + '.hsplitter'; }).join(' '), this.mouseUp.bind(this))
		.bind(moveEvents.map(function(v) { return v + '.hsplitter'; }).join(' '), this.mouseMove.bind(this));

		this.dragBars[this.dragIndex].addClass("dragged");
		$(document.documentElement).css("cursor", "row-resize");
	},

	mouseUp: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();
		if (this.dragIndex !== -1)
			this.endDrag();
	},

	endDrag: function() {
		let doce = $(document.documentElement);
		upEvents.forEach(function(v) { doce.unbind(v + '.hsplitter'); });
		moveEvents.forEach(function(v) { doce.unbind(v + '.hsplitter'); });

		this.dragBars[this.dragIndex].removeClass("dragged");
		$(document.documentElement).css("cursor", "");
		this.dragIndex = -1;
	},

	mouseMove: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();

		let cap = 80 - this.dragSize[this.dragIndex === 0 ? 1 : 0];
		let tsize = this.dragoff + this.dragSign[this.dragIndex] * ev.clientX;
		this.dragSize[this.dragIndex] = Math.max(10, Math.min(cap, 100 * tsize / this.el.offsetWidth));
		this.dragSides[this.dragIndex].$el.css("width", this.dragSize[this.dragIndex] + "%");
	},
});
module.exports = IndexView;
