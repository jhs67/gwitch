'use strict';

const path = require("path");
const app = require('app');
const Menu = require('menu');
const BrowserWindow = require('browser-window');
const dialog = require('dialog');

// report crashes to the Electron project
require('crash-reporter').start();

app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

let menuTemplate = [
{
	label: 'File',
	submenu: [
	{
		label: 'New Window',
		accelerator: 'CmdOrCtrl+N',
		click: newWindowHandler,
	},
	{
		label: 'Open Repository',
		accelerator: 'CmdOrCtrl+O',
		click: openRepoHandler,
	},
	{
		type: 'separator'
	},
	{
		label: 'Reload',
		accelerator: 'CmdOrCtrl+R',
		click: reloadHandler,
	},
	{
		type: 'separator'
	},
	{
		label: 'Close Window',
		accelerator: 'CmdOrCtrl+W',
		click: closeWindowHandler,
	},
	{
		type: 'separator'
	},
	{
		label: 'Quit',
		accelerator: 'CmdOrCtrl+Q',
		click: function() { app.quit(); },
	},
	],
},
{
	label: 'View',
	submenu: [
	{
		label: 'Reload',
		accelerator: 'CmdOrCtrl+R',
		//click: function() { BrowserWindow.getFocusedWindow().reloadIgnoringCache(); }
	},
	{
		label: 'Toggle DevTools',
		accelerator: 'Alt+CmdOrCtrl+I',
		click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
	}
	]
},
];

let openWindows = new Map();

function newWindowHandler(repo) {
	repo = repo || path.resolve(__dirname);

	let window = new BrowserWindow({
		width: 1200,
		height: 800,
	});

	window.loadUrl(`file://${__dirname}/index.html`);
	openWindows.set(window.id, window);

	window.webContents.on('did-finish-load', function() {
		window.webContents.send('open-repo', repo);
	});

	window.on('closed', function () {
		openWindows.delete(window.id);
	});
}

function openRepoHandler() {
	dialog.showOpenDialog({ title: "Open Repository", properties: [ "openDirectory" ] }, function(files) {
		if (files) {
			files.forEach(function(f) {
				newWindowHandler(path.resolve(f));
			});
		}
	});
}

function reloadHandler() {}

function closeWindowHandler() {
	BrowserWindow.getFocusedWindow().close();
}

app.on('ready', function () {
	let menu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu);
	newWindowHandler();
});
