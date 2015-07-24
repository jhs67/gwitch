"use strict";

let child_process = require('child_process');
let path = require('path');
let fs = require('fs');

let OpenCmd = "xdg-open";
if (process.plaform === "darwin")
	OpenCmd = "open";
if (process.plaform === "win32")
	OpenCmd = "start";

exports.openFile = openFile;
function openFile(file, cwd) {
	child_process.spawn(OpenCmd, [ file ], { cwd: cwd });
}

function revealFileOsx(file, cwd) {
	child_process.spawn("open", ["-R", file ], { cwd: cwd });
}

let WithNautilus = false;

function revealFileLinux(file, cwd) {
	if (WithNautilus)
		child_process.spawn("nautilus", [ file ], { cwd: cwd });
	else
		child_process.spawn("xdg-open", [ path.dirname(file) ], { cwd: cwd });
}

if (process.plaform !== "darwin" && process.plaform !== "win32") {
	child_process.exec("which nautilus", function(err, out) {
		WithNautilus = (!err && out.trim());
	});
}

function revealFileWin32(file, cwd) {
	let v = path.resolve(file, cwd);
	let b = path.basename(v);
	let d = path.dirname(v);
	child_process.spawn("explorer", [ "/select," + b ], { cwd: d });
}

exports.revealFile = revealFileLinux;
if (process.plaform === "darwin")
	OpenCmd = revealFileOsx;
if (process.plaform === "win32")
	OpenCmd = revealFileWin32;

exports.deleteFile = deleteFile;
function deleteFile(path) {
	fs.unlink(path);
}
