"use strict";

let $ = require('jquery');
let Backbone = require("backbone");
let filesListHbs = require('./files-list');
let commitMessageHbs = require('./commit-message');
let app = require('./app');

function patchPath(patch) {
	return patch.newFile || patch.oldFile;
}

let MultiFilesView = Backbone.View.extend({

	initialize: function() {
		this.listenTo(this.collection, "all", this.render);
		this.listenTo(app.repoSettings, "change:focusFiles", this.setSelected);
		this.el.classList.add("multi-file-view");
		this.focus = -1;
		this.origin = -1;
		return this.render();
	},

	events: {
		"click .file-item": "onClick",
		'keydown .file-list': 'onKeyPress',
	},

	onKeyPress: function(ev) {
		if (ev.keyCode !== 40 && ev.keyCode !== 38)
			return;

		let items = this.$(".file-item");
		if (items.length === 0) return;

		let n = this.focus, p = n;
		if (n < 0 || n >= items.length)
			p = n = 0;
		else if (ev.keyCode === 40 && this.focus + 1 < items.length)
			n = this.focus + 1;
		else if (ev.keyCode === 38 && this.focus > 0)
			n = this.focus - 1;

		if (n === this.focus)
			return;
		this.focus = n;

		if (ev.shiftKey) {
			if (this.origin === -1)
				this.origin = p;

			let f = [], a = {};
			for (let i = Math.min(n, this.origin); i <= Math.max(n, this.origin); i += 1) {
				let r = this.collection.get(items[i].id);
				f.push(patchPath(r.get('patch')));
			}
			a[this.key] = f;
			app.repoSettings.set("focusFiles", a);
		}
		else {
			this.origin = -1;
			let r = this.collection.get(items[this.focus].id), a = {};
			a[this.key] = [ patchPath(r.get('patch')) ];
			app.repoSettings.set("focusFiles", a);
		}
	},

	onClick: function(ev) {
		ev.stopPropagation();
		ev.preventDefault();

		this.focus = $(ev.currentTarget).index();

		let r = this.collection.get(ev.currentTarget.id);
		let path = patchPath(r.get("patch"));

		let a = app.repoSettings.get("focusFiles");
		let selected = (a && a[this.key]) || [];

		if (ev.ctrlKey) {
			selected = selected.concat([]);
			let i = selected.indexOf(path);
			if (i === -1)
				selected.push(path);
			else
				selected.splice(i, 1);
		}
		else {
			selected = [ path ];
		}

		a = {};
		a[this.key] = selected;
		app.repoSettings.set("focusFiles", a);
	},

	setSelected: function() {
		let c = this.collection;
		let a = app.repoSettings.get("focusFiles");
		let selected = (a && a[this.key]) || [];
		this.$(".file-item").each(function() {
			let r = c.get(this.id);
			let on = selected.indexOf(patchPath(r.get("patch"))) !== -1;
			if (on) this.classList.add("selected");
			else this.classList.remove("selected");
		});
	},

	record: function() {
		return {
			files: this.collection.map(function(r) {
				return {
					id: r.cid,
					path: patchPath(r.get("patch")),
				};
			}),
		};
	},

	render: function() {
		var record = this.record();
		this.$el.html(filesListHbs(record));
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
