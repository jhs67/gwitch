"use strict";

// Set's up require hook to handle hbs files
require("handlebars");

var $ = require('jquery');
var Backbone = require("backbone");

var path = require("path");
var NodeGit = require('nodegit');

var DiffView = require("./DiffView");
var RefsView = require("./RefsView");
var SplitterView = require("./SplitterView");


var BranchModel = Backbone.Model.extend({
});

var BranchCollection = Backbone.Collection.extend({
	model: BranchModel,
});

var WorkingCopyModel = Backbone.Model.extend({
});

var app = module.exports;

app.repo = null;
app.branches = new BranchCollection();
app.workingCopy = new WorkingCopyModel();

function localBranchName(branch) {
	if (branch.substr(0, "refs/heads/".length) == "refs/heads/")
		return branch.substr("refs/heads/".length);
	return branch;
}

app.open = function(file) {
	app.workingCopy.set('name', path.basename(file, ".git"));
	NodeGit.Repository.open(file).then(function(repo) {
		app.repo = repo;
		return Promise.all([
			repo.getReferences(NodeGit.Reference.TYPE.ALL).then(function(refs) {
				var branches = refs.filter(function(ref) { return ref.isBranch(); }).map(function(ref) {
					var name = ref.name();
					return {
						refName: name,
						name: localBranchName(name),
						isRemote: ref.isRemote(),
					};
				});

				app.branches.add(branches);
			}),
			repo.head().then(function(ref) {
				app.workingCopy.set('head', ref.name());
			}),
		]);
	}).catch(function(err) {
		console.log("error: " + err);
	});
};

var ClientView = Backbone.View.extend({
	className: 'client-view',

	initialize: function() {
		this.refs = new RefsView();
		this.$el.append(this.refs.el);

		this.diff = new DiffView();
		this.splitter = new SplitterView({ top: this.diff.$el });
		this.$el.append(this.splitter.el);

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
	app.open(path.resolve(path.dirname(__dirname)));
	var c = new ClientView({});
	$('#container').append(c.$el);
});
