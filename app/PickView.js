"use strict";

var Backbone = require("backbone");
var DiffView = require("./DiffView");

var PickView = DiffView.extend({

	initialize: function(opt) {
		this.settings = opt.settings;
		Backbone.View.prototype.initialize.call(this, arguments);
		this.listenTo(this.collection, "all", this.render);
		this.listenTo(this.settings, "change:focusFiles", this.render);
		return this.render();
	},

	record: function() {
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
