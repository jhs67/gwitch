"use strict";

// Set's up require hook to handle hbs files
require("handlebars");

var $ = require('jquery');
var Backbone = require("backbone");

var path = require("path");
var NodeGit = require('nodegit');

var DiffView = require("./DiffView");
var RefsView = require("./RefsView");

var ClientView = Backbone.View.extend({
	className: 'client-view',

	initialize: function() {
		this.refs = new RefsView();
		this.$el.append(this.refs.el);
		this.diff = new DiffView();
		this.$el.append(this.diff.el);
		return this.render();
	},

	render: function(mode, f) {
		var self = this;

		var g = path.dirname(__dirname);
		NodeGit.Repository.open(g).then(function(repo) {
			return NodeGit.Diff.indexToWorkdir(repo, null, null);
		}).then(function(diff) {
			self.diff.model = diff;
			self.diff.render();
		}, function(err) {
			console.log("haa...");
			self.$el.text(err.message);
		});
	}
});

addEventListener('load', function() {
	var c = new ClientView({});
	$('#container').append(c.$el);
});
