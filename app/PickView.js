"use strict";

var $ = require('jquery');
var Backbone = require("backbone");
var DiffView = require("./DiffView");

var PickView = DiffView.extend({

	events: {
		"mousedown .diff-line": "dragStart",
		"click .button": "buttonClick",
	},

	dragStart: function(ev) {
		if (ev.button !== 0)
			return;
		ev.preventDefault();

		this.lines = this.$('.diff-line').toArray();
		this.anchor = this.lines.indexOf(ev.currentTarget);
		this.lines.forEach(function(e) { e.classList.remove('selected'); });
		this.last = this.anchor;

		// Use the window events to get a little more range.
		$(window).on('mousemove.pick', this.dragMove.bind(this));
		$(window).one('mouseup', this.dragEnd.bind(this));
		ev.currentTarget.classList.add('selected');

		var b = this.$('.button');
		b.removeClass('show');
	},

	dragMove: function(ev) {
		var es = this.lines;
		var l = 0, h = es.length;
		while (h - l > 1) {
			var m = Math.floor((l + h) / 2);
			var em = es[m];
			if (ev.clientY <= $(em).offset().top)
				h = m;
			else
				l = m;
		}

		if (l < this.anchor) {
			for (h = l; h < this.anchor && h < this.last; h += 1)
				es[h].classList.add('selected');
			for (h = this.last; h < l; h += 1)
				es[h].classList.remove('selected');
			for (h = this.last; h > this.anchor; h -= 1)
				es[h].classList.remove('selected');
		}
		else {
			for (h = l; h > this.anchor && h > this.last; h -= 1)
				es[h].classList.add('selected');
			for (h = this.last; h < this.anchor; h += 1)
				es[h].classList.remove('selected');
			for (h = this.last; h > l; h -= 1)
				es[h].classList.remove('selected');
		}
		this.last = l;
	},

	dragEnd: function(ev) {
		$(window).off('mousemove.pick');

		var es = this.lines;
		var l = this.anchor;
		while (l > 0 && es[l - 1].classList.contains('selected'))
			l -= 1;

		var top = 1;
		for (var e = es[l]; e && !e.classList.contains('patches'); e = e.parentElement)
			top += e.offsetTop;

		var b = this.$('.stage.button');
		b.css('top', top);
		b.addClass('show');

		var text = this.settings.get("focusFiles") && this.settings.get("focusFiles").staged ? "unstage" : "stage";
		text += (this.last === this.anchor) ? " line" : " lines";
		b.text(text);
	},

	buttonClick: function(ev) {
		console.log("buttonClick");
	},

	initialize: function(opt) {
		this.settings = opt.settings;
		Backbone.View.prototype.initialize.call(this, arguments);
		this.listenTo(this.collection, "all", this.render);
		this.listenTo(this.settings, "change:focusFiles", this.render);
		return this.render();
	},

	record: function() {
		this.$('.button').removeClass('show');

		var patches = [];
		var focusFiles = this.settings.get("focusFiles");
		var staged = (focusFiles && focusFiles.staged) || [];
		var unstaged = (focusFiles && focusFiles.unstaged) || [];

		this.collection.forEach(function(r) {
			let path = r.get('path');
			if (unstaged.indexOf(path) !== -1 && r.get('workingPatch'))
				patches.push(DiffView.patchRecord(r.get('workingPatch')));
			if (staged.indexOf(path) !== -1 && r.get('indexPatch'))
				patches.push(DiffView.patchRecord(r.get('indexPatch')));
			if (staged.length === 0 && unstaged.length === 0 && r.get('workingPatch'))
				patches.push(DiffView.patchRecord(r.get('workingPatch')));
		});

		return { patches: patches };
	},
});
module.exports = PickView;
