"use strict";

var Backbone = require("backbone");
var DiffView = require("./DiffView");
var app = require('./app');

var PickView = DiffView.extend({

	initialize: function() {
		Backbone.View.prototype.initialize.call(this, arguments);
		this.listenTo(app.patches, "all", this.render);
		this.listenTo(app.indexPatches, "all", this.render);
		this.listenTo(app.repoSettings, "change:focusFiles", this.render);
		return this.render();
	},

	record: function() {
		var patches = [];
		var focusFiles = app.repoSettings.get("focusFiles");
		var staged = (focusFiles && focusFiles.staged) || [];
		var unstaged = (focusFiles && focusFiles.unstaged) || [];
		if (staged.length === 0 && unstaged.length === 0)
			return { patches: app.patches.map(function(r) { return DiffView.patchRecord(r.get('patch')); }) };

		app.patches.forEach(function(r) {
			let patch = r.get("patch");
			if (unstaged.indexOf(patch.newFile().path() || patch.oldFile().path()) !== -1)
				patches.push(DiffView.patchRecord(patch));
		});
		app.indexPatches.forEach(function(r) {
			let patch = r.get("patch");
			if (staged.indexOf(patch.newFile().path() || patch.oldFile().path()) !== -1)
				patches.push(DiffView.patchRecord(patch));
		});
		return { patches: patches };
	},
});
module.exports = PickView;
