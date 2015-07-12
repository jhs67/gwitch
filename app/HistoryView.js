"use strict";

var moment = require("moment");
var Backbone = require("backbone");

const pathSegs = [
	"M 0,12 a 8,8 0 0 1 8,8 l 0,4",
	"M 0,12 l 16,0",
	"M 0,12 a 8,8 0 0 0 8,-8 l 0,-4",
	"M 8,0 l 0,24",
	"M 16,12 a 8 8 0 0 1 -8,-8 l 0,-4",
	"M 16,12 a 8 8 0 0 0 -8,8 l 0,4",
];

const nodeSegs = [
	"M 8,0 l 0,6",
	"M 0,12 l 2,0",
	"M 16,12 l -2,0",
	"M 8,24 l 0,-6",
];

function makeSVGs() {
	/*jslint bitwise: true */
	let r = [];
	let NS="http://www.w3.org/2000/svg";
	for (let i = 0; i < 64; i += 1) {
		let svg = document.createElementNS(NS, "svg");
		svg.setAttribute("viewBox", "0 0 16 24");

		let p = "";
		for (let j = 0; j < 6; ++j) {
			if (i & (1 << j))
				p += pathSegs[j];
		}
		if (p) {
			let path = document.createElementNS(NS, "path");
			path.classList.add("graph-path");
			path.setAttribute("d", p);
			svg.appendChild(path);
		}
		r.push(svg);
	}

	for (let i = 0; i < 16; ++i) {
		let svg = document.createElementNS(NS, "svg");
		svg.setAttribute("viewBox", "0 0 16 24");

		let p = "";
		for (let j = 0; j < 4; ++j) {
			if (i & (1 << j))
				p += nodeSegs[j];
		}
		if (p) {
			let path = document.createElementNS(NS, "path");
			path.classList.add("graph-leg");
			path.setAttribute("d", p);
			svg.appendChild(path);
		}

		let circle = document.createElementNS(NS, "circle");
		circle.classList.add("graph-node");
		circle.setAttribute("cx", 8);
		circle.setAttribute("cy", 12);
		circle.setAttribute("r", 6);
		svg.appendChild(circle);

		r.push(svg);
	}

	return r;
}

const GraphGlyphs = makeSVGs();

function makeHeader() {
	let row = document.createElement('tr');

	let th = document.createElement('th');
	th.classList.add('short-hash');
	th.appendChild(document.createTextNode("Short SHA"));
	row.appendChild(th);

	th = document.createElement('th');
	th.classList.add('subject');
	th.appendChild(document.createTextNode("Summary"));
	row.appendChild(th);

	th = document.createElement('th');
	th.classList.add('author');
	th.appendChild(document.createTextNode("Author"));
	row.appendChild(th);

	th = document.createElement('th');
	th.classList.add('date');
	th.appendChild(document.createTextNode("Date"));
	row.appendChild(th);

	let table = document.createElement('table');
	table.appendChild(row);

	let div = document.createElement('div');
	div.classList.add('header');
	div.appendChild(table);

	return div;
}

const HistoryHeader = makeHeader();

function makeProtoRow() {
	// Create the prototype row
	let row = document.createElement('tr');
	let td = document.createElement('td');
	td.classList.add("short-hash");
	row.appendChild(td);

	td = document.createElement('td');
	td.classList.add("subject");
	let div = document.createElement('div');
	div.classList.add("commit-line");
	let sp = document.createElement("span");
	sp.classList.add("message");
	div.appendChild(sp);
	td.appendChild(div);
	row.appendChild(td);

	td = document.createElement('td');
	td.classList.add("author");
	row.appendChild(td);

	td = document.createElement('td');
	td.classList.add("date");
	row.appendChild(td);

	return row;
}

let HistoryRow = makeProtoRow();

function makeRow(sha, graph, summary, author, date, refs) {
	let tr = HistoryRow.cloneNode(true);
	tr.setAttribute("id", sha);

	tr.childNodes[0].appendChild(document.createTextNode(sha.substr(0, 7)));

	let td = tr.childNodes[1].firstChild;
	graph.forEach(function(g) {
		td.insertBefore(GraphGlyphs[g].cloneNode(true), td.lastChild);
	});
	refs.forEach(function(g) {
		let s = document.createElement('span');
		s.classList.add('commit-ref');
		s.classList.add(g.type);
		s.appendChild(document.createTextNode(g.name));
		td.insertBefore(s, td.lastChild);
	});
	td.lastChild.appendChild(document.createTextNode(summary));

	tr.childNodes[2].appendChild(document.createTextNode(author));

	tr.childNodes[3].appendChild(document.createTextNode(moment(date).format('LLL')));

	return tr;
}

var HistoryView = Backbone.View.extend({
	className: 'history-view',

	initialize: function(opts) {
		this.refs = opts.refs;
		this.repoSettings = opts.repoSettings;
		this.listenTo(this.collection, "all", this.render);
		this.listenTo(this.repoSettings, "change:focusCommit", this.setFocus);
		this.render();
	},

	events: {
		'click .wrapper tr': "clickRow",
	},

	clickRow: function(ev) {
		this.repoSettings.set('focusCommit', ev.currentTarget.id);
	},

	setFocus: function() {
		if (this.oldFocus)
			this.$("#" + this.oldFocus).removeClass('focus');
		this.oldFocus = this.repoSettings.get('focusCommit');
		if (this.oldFocus) {
			let e = this.$("#" + this.oldFocus);
			e.addClass('focus');
			if (e[0]) e[0].scrollIntoView();
		}
	},

	render: function() {
		this.$el.empty();
		this.el.appendChild(HistoryHeader.cloneNode(true));

		// Create a row for each commit
		let refs = this.refs.toJSON();
		let table = document.createElement('table');
		this.collection.map(function(c) {
			let commit = c.get('commit');
			let r = refs.filter(function(r) {
				return !(r.type === "remotes" && r.name.split('/').pop() === "HEAD") && r.hash === c.id;
			});

			let tr = makeRow(c.id, c.get('graph'), commit.subject, commit.authorName,
				new Date(commit.authorStamp * 1000), r);
			table.appendChild(tr);
			return tr;
		});

		// Add the master table
		let div = document.createElement('div');
		div.classList.add('wrapper');
		div.appendChild(table);
		this.el.appendChild(div);

		this.oldFocus = null;
		this.setFocus();

		return this;
	},
});
module.exports = HistoryView;
