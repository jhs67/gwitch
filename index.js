'use strict';

let path = require("path");
let electron = require('electron');

let app = electron.app;
let Menu = electron.Menu;
let dialog = electron.dialog;
let ipcMain = electron.ipcMain;
let BrowserWindow = electron.BrowserWindow;

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

let windowManager = null;
let recentRepos = null;

function sendOpenRepo(window, repo) {
	window.setTitle("gwitch - " + path.basename(repo, ".git"));
	window.webContents.send('open-repo', repo);
	recentRepos.add(repo);
}

function sendOpenRecent(window) {
	window.setTitle("gwitch");
	window.webContents.send('recent', recentRepos.repoList);
}

function newWindowHandler(repo) {
	let props = windowManager.props();
	props.icon = __dirname + "/assets/icon.png";
	let window = new BrowserWindow(props);
	windowManager.track(window);

	window.loadURL(`file://${__dirname}/index.html`);
	window.webContents.on('did-finish-load', function() {
		if (repo)
			sendOpenRepo(window, repo);
		else {
			sendOpenRecent(window);
		}
	});
}

function openRepoHandler() {
	dialog.showOpenDialog({ title: "Open Repository", properties: [ "openDirectory" ] }, function(files) {
		if (files) {
			files.forEach(function(f) {
				f = path.resolve(f);
				newWindowHandler(f);
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
	windowManager = new (require('./app/windowManager')).WindowManager();

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
				sendOpenRepo(ev.sender.getOwnerBrowserWindow(), f);
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
	sendOpenRepo(ev.sender.getOwnerBrowserWindow(), f);
});

ipcMain.on('open-recent', function(ev) {
	sendOpenRecent(ev.sender.getOwnerBrowserWindow());
});

ipcMain.on('rm-repo', function(ev, repo) {
	recentRepos.remove(repo);
});
