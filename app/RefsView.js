"use strict";

var $ = require('jquery');
var Backbone = require("backbone");
var refsHbs = require('./refs.hbs');
var app = require('./app');

var RefsView = Backbone.View.extend({
	className: 'refs-view',

	initialize: function() {
		this.listenTo(app.branches, "all", this.invalidate);
		this.listenTo(app.workingCopy, "change:head", this.setHead);
		this.listenTo(app.repoSettings, "change:activeBranch", this.setActive);
		return this.render();
	},

	events: {
		"click .stage": "clickStage",
		"click .branch-line": "clickBranch",
	},

	clickStage: function(ev) {
		app.repoSettings.set({ "activeBranch" : "" });
	},

	clickBranch: function(ev) {
		var index = $(ev.currentTarget).index() - 1;
		app.repoSettings.set({ "activeBranch" : app.branches.at(index).get("refName") });
	},

	invalidate: function() {
		var self = this;
		if (self.timeout) return;
		self.timeout = setTimeout(function() { self.timeout = null; self.render(); }, 100);
	},

	branchIndex: function(refname) {
		var r = -1;
		app.branches.forEach(function(b, i) { if (b.get("refName") == refname) r = i; });
		return r;
	},

	setHead: function() {
		this.$(".branch-line").removeClass("active-ref");
		var index = this.branchIndex(app.workingCopy.get("head"));
		if (index >= 0) $(this.$(".branch-line")[index]).addClass("active-ref");
	},

	setActive: function() {
		var branch = app.repoSettings.get("activeBranch");
		if (!branch) {
			this.$(".branch-line").removeClass("selected");
			this.$(".stage-line").addClass("selected");
		}
		else {
			var index = this.branchIndex(branch);
			this.$(".branch-line").removeClass("selected");
			if (index >= 0) $(this.$(".branch-line")[index]).addClass("selected");
			this.$(".stage-line").removeClass("selected");
		}
	},

	record: function() {
		return {
			title: app.workingCopy.get("name"),
			branches: app.branches.toJSON(),
		};
	},

	render: function(mode, f) {
		var record = this.record();
		this.$el.html(refsHbs(record));
		this.setActive();
		this.setHead();
	},
});
module.exports = RefsView;
