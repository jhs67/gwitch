		"click .patch-header": "clickExpand",
		this.listenTo(this.model, "change", this.refresh);
	refresh: function() {
		if (!this.immediate)
			this.immediate = setImmediate(() => { this.immediate = null; this.render(); });
	},

		this.model.set('show', true);
	clickExpand: function(ev) {
		if (this.model.get('hunks') && !this.model.get('binary'))
			this.model.set('show', !this.model.show());
	},

		let lines = this.model.get('lines');
		let show = this.model.show();
		let file = this.model.path();
		let r = { file, show, lines, status, binary, msgs: [], loading: !binary && !hunks };
		if (show && hunks)
			let v = new PatchView({ model: p });