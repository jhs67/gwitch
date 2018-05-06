
let electron = require('electron');
let jetpack = require('fs-jetpack');
var deepEqual = require('deep-equal');

class WindowManager {
	constructor() {
		this.windows = new Map();

		this.dataDir = jetpack.cwd(electron.app.getPath('userData'));
		this.storeFile = "window-state.json";

		this.state = this.dataDir.read(this.storeFile, 'json');
		if (!this.stateValid())
			this.state = {};

		if (typeof this.state.width !== 'number')
			this.state.width = 1200;
		if (typeof this.state.height !== 'number')
			this.state.height = 800;
	}

	stateValid() {
		if (typeof this.state !== 'object')
			return false;
		if (typeof this.state.x !== 'number' || typeof this.state.y !== 'number')
			return false;
		if (typeof this.state.width !== 'number' || typeof this.state.height !== 'number')
			return false;

		var displayBounds = electron.screen.getDisplayMatching(this.state).bounds;
		if (!deepEqual(this.state.displayBounds, displayBounds, {strict: true}))
			return false;

		return true;
	}

	updateState(win) {
		var winBounds = win.getBounds();
		this.state.isMaximized = win.isMaximized();
		this.state.isFullScreen = win.isFullScreen();
		this.state.displayBounds = electron.screen.getDisplayMatching(winBounds).bounds;
		this.state.x = winBounds.x;
		this.state.y = winBounds.y;
		this.state.width = winBounds.width;
		this.state.height = winBounds.height;
	}

	saveState() {
		this.dataDir.write(this.storeFile, this.state, { atomic: true });
	}

	props() {
		let r = {
			width: this.state.width,
			height: this.state.height,
		};

		// For the first window only, set the position
		if (this.windows.keys().next().done && typeof this.state.x === 'number' && typeof this.state.y === 'number') {
			r.x = this.state.x;
			r.y = this.state.y;
		}

		return r;
	}

	track(win) {
		let id = win.id;
		this.windows.set(id, win);

		if (this.state.isMaximized)
			win.maximize();

		if (this.state.isFullScreen)
			win.setFullScreen(true);

		win.on('close', () => {
			this.updateState(win);
		});

		win.on('closed', () => {
			this.windows.delete(id);
			this.saveState();
		});
	}

}

exports.WindowManager = WindowManager;
