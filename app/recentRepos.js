
let app = require('electron').app;
let jetpack = require('fs-jetpack');

exports.RecentRepos = RecentRepos;
function RecentRepos() {
	this.dataDir = jetpack.cwd(app.getPath('userData'));
	this.storeFile = "recent-repos.json";

	this.repoList = this.dataDir.read(this.storeFile, 'json') || [];
	if (!Array.isArray(this.repoList) || !this.repoList.every(function(r) { return r && typeof r === 'string'; }))
		this.repoList = [];
}

RecentRepos.prototype.add = function(r) {
	let i = this.repoList.indexOf(r);
	if (i >= 0) this.repoList.splice(i, 1);
	this.repoList.unshift(r);
	this.repoList.splice(20, this.repoList.length);
	this.dataDir.write(this.storeFile, this.repoList, { atomic: true });
};

RecentRepos.prototype.remove = function(r) {
	let i = this.repoList.indexOf(r);
	if (i >= 0) {
		this.repoList.splice(i, 1);
		this.dataDir.write(this.storeFile, this.repoList, { atomic: true });
	}
};
