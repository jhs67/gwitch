"use strict";

let app = require('electron').remote.app;
let jetpack = require('fs-jetpack');

module.exports = JetSync;
function JetSync(method, model, options) {
	if (method === 'update' || method === 'create') {
		let r = model.toJSON();
		let storeFile = model.url();
		let dataDir = jetpack.cwd(app.getPath('userData'));
		dataDir.write(storeFile, r, { atomic: true });
		if (options && options.success) options.success(r);
	}
	else if (method === 'read') {
		let storeFile = model.url();
		let dataDir = jetpack.cwd(app.getPath('userData'));
		let r = dataDir.read(storeFile, 'json') || {};
		if (options && options.success) options.success(r);
	}
	else if (method === 'delete') {
		let storeFile = model.url();
		let dataDir = jetpack.cwd(app.getPath('userData'));
		dataDir.remove(storeFile);
	}
}
