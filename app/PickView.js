"use strict";

var $ = require('jquery');
var DiffView = require("./DiffView");

var PickView = DiffView.extend({

	events: {
		"mousedown .diff-line": "dragStart",
		"click .button": "buttonClick",
		"keydown": "keyDown",
	},

	keyDown: function(ev) {
		let c = String.fromCharCode(ev.keyCode);
		let ctrl = ev.ctrlKey, meta = ev.metaKey, alt = ev.altKey;
		if (c === 'S' && !ctrl && !meta && !alt) {
			this.buttonClick(ev);
		}
	},

	dragStart: function(ev) {
		if (ev.button !== 0)
			return;

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
		for (var e = es[l]; e && !e.classList.contains('patch'); e = e.parentElement)
			top += e.offsetTop;

		var b = this.$('.stage.button');
		b.css('top', top);
		b.addClass('show');

		var text = this.settings.get("focusFiles") && this.settings.get("focusFiles").staged ? "unstage" : "stage";
		text += (this.last === this.anchor) ? " line" : " lines";
		b.text(text);
	},

	buttonClick: function(ev) {
		var es = this.lines;
		var total = "", index = 0;

		let toadd = [];
		let forward = !this.settings.get("focusFiles") || !this.settings.get("focusFiles").staged;
		this.patches.forEach(function (patch) {
			var noff = 0, ooff = 0, file = "";
			patch.hunks.forEach(function(hunk) {
				var nstart = hunk.newStart + noff;
				var ostart = hunk.oldStart + ooff;
				var ncount = 0, ocount = 0, changes = false, content = "";
				hunk.lines.forEach(function(line) {
					var on = es[index].classList.contains('selected');
					index += 1;

					if (line.origin === " ") {
						content += " " + line.content + '\n';
						ncount += 1;
						ocount += 1;
					}
					else if (line.origin === '-') {
						if (on) {
							content += "-" + line.content + "\n";
							changes = true;
							ocount += 1;
						}
						else if (forward) {
							content += " " + line.content + '\n';
							ocount += 1;
							ncount += 1;
							noff += 1;
						}
						else {
							ooff -= 1;
						}
					}
					else if (line.origin === '+') {
						if (on) {
							content += "+" + line.content + "\n";
							changes = true;
							ncount += 1;
						}
						else if (!forward) {
							content += " " + line.content + "\n";
							ocount += 1;
							ncount += 1;
							ooff += 1;
						}
						else {
							noff -= 1;
						}
					}
				});

				if (changes)
					file += "@@ -" + ostart + "," + ocount + " +" + nstart + "," + ncount + " @@\n" + content;
			});

			if (file) {
				let oldFile = patch.oldFile;
				if (!oldFile) {
					oldFile = patch.newFile;
					toadd.push(patch.newFile);
				}
				total += "--- a/" + oldFile + "\n+++ b/" + patch.newFile + "\n" + file;
			}
		});

		toadd.reduce((p, file) => { return p.then(() => {
			return this.app.repo.addIntent(file);
		}); }, Promise.resolve())
		.then(() => {
			return this.app.repo.stagePatch(total, !forward);
		})
		.then(() => {
			this.app.workingUpdater.commit();
		});
	},

	initialize: function(opt) {
		this.app = opt.app;
		this.settings = opt.settings;
		this.listenTo(this.settings, "change:focusFiles", this.render);
		DiffView.prototype.initialize.apply(this, arguments);
	},

	record: function() {
		var focusFiles = this.settings.get("focusFiles");
		var staged = (focusFiles && focusFiles.staged) || [];
		var unstaged = (focusFiles && focusFiles.unstaged) || [];

		var patches = this.patches = [];
		this.collection.forEach(function(r) {
			let path = r.get('path');
			if (unstaged.indexOf(path) !== -1 && r.get('workingPatch'))
				patches.push(r.get('workingPatch'));
			if (staged.indexOf(path) !== -1 && r.get('indexPatch'))
				patches.push(r.get('indexPatch'));
			if (staged.length === 0 && unstaged.length === 0 && r.get('workingPatch'))
				patches.push(r.get('workingPatch'));
		});

		return { patches: this.patches.map(function (p) { return DiffView.patchRecord(p); }) };
	},

	render: function() {
		DiffView.prototype.render.apply(this, arguments);
		this.lines = this.$('.diff-line').toArray();
		this.$('.button').removeClass('show');
		this.$('.patches').attr('tabindex', 1);
		return this;
	}
});
module.exports = PickView;
