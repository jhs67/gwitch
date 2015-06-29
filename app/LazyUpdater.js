"use strict";

module.exports = LazyUpdater;
function LazyUpdater(updater, quiscent, limit) {
	this.updater = updater;
	this.quiscent = quiscent || 500;
	this.limit = limit || 5000;
	this.lastGood = null;
	this.pokedAt = null;
	this.timer = null;
}

LazyUpdater.prototype.startUpdate = function() {
	let lazy = this;
	lazy.busy = true;
	lazy.pokedAt = null;
	lazy.lastGood = null;
	lazy.updater().then(function() {
		lazy.busy = false;
		lazy.schedule();
	});
};

LazyUpdater.prototype.schedule = function() {
	let lazy = this;
	if (lazy.busy) return;
	if (lazy.timer) return;
	if (lazy.pokedAt === null) return;

	let wake = lazy.pokedAt + lazy.quiscent;
	if (lazy.lastGood !== null);
		wake = Math.min(lazy.lastGood + lazy.limit, wake);
	let delay = wake - Date.now();
	if (delay <= 0)
		return lazy.startUpdate();

	lazy.timer = setTimeout(function() { lazy.timer = null; lazy.schedule(); }, delay + 10);
};

LazyUpdater.prototype.poke = function() {
	let lazy = this;
	lazy.pokedAt = Date.now();
	if (lazy.lastGood === null)
		lazy.lastGood = lazy.pokedAt;
	lazy.schedule();
};

LazyUpdater.prototype.start = function() {
	let lazy = this;
	if (lazy.busy) {
		this.pokedAt = Date.now() - lazy.quiscent;
		return;
	}
	if (lazy.timer) {
		clearTimeout(lazy.timer);
		lazy.timer = null;
	}
	lazy.startUpdate();
};
