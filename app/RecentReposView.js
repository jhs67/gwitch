"use strict";

var Backbone = require("backbone");
var ipcRenderer = require('electron').ipcRenderer;
var $ = require('jquery');

var recentReposHbs = require('./recent-repos.hbs');

var RecentReposView = Backbone.View.extend({
	className: 'recent-repos',

	initialize: function() {
		this.listenTo(this.collection, "all", this.render);
		return this.render();
	},

	events: {
		"click .repo-button": "openOther",
		"click .repo-item": "openRecent",
		"click .repo-rm": "removeRecent",
	},

	openOther: function(ev) {
		ipcRenderer.send('open-other');
	},

	openRecent: function(ev) {
		ev.stopPropagation();
		var index = $(ev.currentTarget).index();
		let m = this.collection.at(index);
		ipcRenderer.send('open-repo', m.get('path'));
	},

	removeRecent: function(ev) {
		ev.stopPropagation();
		var index = $(ev.currentTarget).parent().index();
		let m = this.collection.at(index);
		ipcRenderer.send('rm-repo', m.get('path'));
		this.collection.remove(m);
	},

	render: function() {
		this.$el.html(recentReposHbs({ repos: this.collection.toJSON() }));
	},
});
module.exports = RecentReposView;
