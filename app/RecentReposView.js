"use strict";

var path = require('path');
var Backbone = require("backbone");
var ipcRenderer = require('electron').ipcRenderer;
var $ = require('jquery');

var recentReposHbs = require('./recent-repos.hbs');

var RecentReposView = Backbone.View.extend({
	className: 'recent-repos',

	initialize: function() {
		return this.render();
	},

	events: {
		"click .repo-button": "openOther",
		"click .repo-item": "openRecent",
	},

	openOther: function(ev) {
		ipcRenderer.send('open-other');
	},

	openRecent: function(ev) {
		var index = $(ev.currentTarget).index();
		ipcRenderer.send('open-repo', this.collection[index]);
	},

	render: function() {
		this.$el.html(recentReposHbs({
			repos: this.collection.map(function(r) {
				return {
					name: path.basename(r, ".git"),
					path: r,
				};
			})
		}));
	},
});
module.exports = RecentReposView;
