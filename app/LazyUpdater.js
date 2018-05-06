
module.exports = LazyUpdater;
function LazyUpdater(updater, quiscent, limit) {
	this.updater = updater;
	this.quiscent = quiscent || 500;
	this.limit = limit || 5000;
	this.lastGood = null;
	this.pokedAt = null;
	this.timer = null;
	this.wake = 0;
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
	if (lazy.pokedAt === null) return;

	let wake = lazy.pokedAt + lazy.quiscent;
	if (lazy.lastGood !== null);
		wake = Math.min(lazy.lastGood + lazy.limit, wake);
	if (lazy.timer && wake > lazy.wake - 10)
		return;

	let delay = wake - Date.now();
	if (delay <= 0)
		return lazy.startUpdate();

	if (lazy.timer)
		clearTimeout(lazy.timer);
	lazy.timer = setTimeout(function() { lazy.timer = null; lazy.schedule(); }, delay + 10);
};

LazyUpdater.prototype.poke = function() {
	let lazy = this;
	lazy.pokedAt = Date.now();
	if (lazy.lastGood === null)
		lazy.lastGood = lazy.pokedAt;
	lazy.schedule();
};

LazyUpdater.prototype.commit = function() {
	let lazy = this;
	lazy.pokedAt = Date.now() - lazy.quiscent * 0.90;
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
