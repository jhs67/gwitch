'use strict';

const app = require('app');
const path = require("path");
const Menu = require('menu');
const ipcMain = require('electron').ipcMain;
const BrowserWindow = require('browser-window');
const dialog = require('dialog');

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
		click: function() { newWindowHandler(); },
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
		accelerator: 'CmdOrCtrl+G',
		click: function() { BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache(); }
	},
	{
		label: 'Toggle DevTools',
		accelerator: 'CmdOrCtrl+Shift+J',
		click: function() { BrowserWindow.getFocusedWindow().toggleDevTools(); }
	}
	]
},
];

let openWindows = new Map();
let recentRepos = null;

function newWindowHandler(repo) {
	let window = new BrowserWindow({
		icon: __dirname + "/assets/icon.png",
		width: 1200,
		height: 800,
	});

	window.loadURL(`file://${__dirname}/index.html`);
	openWindows.set(window.id, window);
	let id = window.id;

	window.webContents.on('did-finish-load', function() {
		if (repo)
			window.webContents.send('open-repo', repo);
		else {
			window.webContents.send('recent', recentRepos.repoList);
		}
	});

	window.on('closed', function () {
		openWindows.delete(id);
	});
}

function openRepoHandler() {
	dialog.showOpenDialog({ title: "Open Repository", properties: [ "openDirectory" ] }, function(files) {
		if (files) {
			files.forEach(function(f) {
				f = path.resolve(f);
				newWindowHandler(f);
				recentRepos.add(f);
			});
		}
	});
}

function reloadHandler() {
	let window = BrowserWindow.getFocusedWindow();
	if (window)
		window.webContents.send('reload');
}

function closeWindowHandler() {
	BrowserWindow.getFocusedWindow().close();
}

app.on('ready', function () {
	recentRepos = new (require('./app/recentRepos')).RecentRepos();

	let menu = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu);
	newWindowHandler();
});

ipcMain.on('open-other', function(ev) {
	dialog.showOpenDialog({ title: "Open Repository", properties: [ "openDirectory" ] }, function(files) {
		if (files) {
			let f = files.shift();
			if (f) {
				f = path.resolve(f);
				ev.sender.send('open-repo', f);
				recentRepos.add(f);
			}
			files.forEach(function(f) {
				f = path.resolve(f);
				newWindowHandler(f);
				recentRepos.add(f);
			});
		}
	});
});

ipcMain.on('open-repo', function(ev, repo) {
	let f = path.resolve(repo);
	ev.sender.send('open-repo', f);
	recentRepos.add(f);
});


ipcMain.on('open-recent', function(ev) {
	ev.sender.send('recent', recentRepos.repoList);
});
