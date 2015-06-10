"use strict";

let $ = require('jquery');
let Backbone = require("backbone");
let filesListHbs = require('./files-list');
let commitMessageHbs = require('./commit-message');
let app = require('./app');

let MultiFilesView = Backbone.View.extend({

	initialize: function() {
		this.listenTo(this.collection, "all", this.render);
		this.listenTo(app.repoSettings, "change:focusFiles", this.setSelected);
		return this.render();
	},

	events: {
		"change select": "onChange",
	},

	onChange: function(ev) {
		var focusFiles = {};
		focusFiles[this.key] = this.$("option:selected").map(function() { return this.value; }).get();
		app.repoSettings.set("focusFiles", focusFiles);
	},

	setSelected: function() {
		var a = app.repoSettings.get("focusFiles");
		var selected = (a && a[this.key]) || [];
		this.$("option").each(function() {
			$(this).prop("selected", selected.indexOf(this.value) !== -1);
		});
	},

	record: function() {
		return {
			files: this.collection.map(function(r) {
				let patch = r.get("patch");
				let oldFile = patch.oldFile().path();
				let newFile = patch.newFile().path();
				return {
					path: newFile || oldFile
				};
			}),
		};
	},

	render: function() {
		var record = this.record();
		this.$el.html(filesListHbs(record));
		this.$("select").addClass(this.key);
		this.$(".index-header").text(this.title);
		this.setSelected();
		return this;
	},
});

let WorkingFilesView = MultiFilesView.extend({
	className: "working-files",
	key: "unstaged",
	title: "Unstaged Files",
});

let IndexFilesView = MultiFilesView.extend({
	className: "index-files",
	title: "Staged Files",
	key: "staged",
});

let CommitMessageView = Backbone.View.extend({
	className: 'commit-message',

	initialize: function() {
		return this.render();
	},

	record: function() {
		return { files: [] };
	},

	render: function() {
		this.$el.html(commitMessageHbs(this.record()));
	},
});

let moveEvents = [ 'mousemove', 'touchmove' ];
let upEvents = [ 'mouseup', 'touchend', 'touchleave', 'touchcancel' ];

let IndexView = Backbone.View.extend({
	className: 'index-view',

	initialize: function() {
		this.working = new WorkingFilesView({ collection: app.patches });
		this.lbar = $('<div class="hsplitter-bar"><div class="gap"/><div class="splitter-dot"/><div class="gap"/></div>');
		this.commit = new CommitMessageView();
		this.rbar = $('<div class="hsplitter-bar"><div class="gap"/><div class="splitter-dot"/><div class="gap"/></div>');
		this.index = new IndexFilesView({ collection: app.indexPatches });

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
