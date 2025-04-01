<h1 align="center">
  <img width=200 src="author/icon.svg" />
  <br />
  gwitch
  <br />
  <span style="font-size: 50%">git magic</span>
</h1>

<h4 align="center">
A multi-platform visual git client built using <a href="https://www.electronjs.org/" target="_blank">Electron</a>
</h4>

<p align="center">
  <img alt="License" src="https://img.shields.io/github/license/jhs67/gwitch">
</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#how-to-use">How To Use</a> •
  <a href="#download">Download</a> •
  <a href="#credits">Credits</a> •
  <a href="#license">License</a>
</p>

<img src="author/gwitch-demo.gif" />

## Key Features

- Line-by-line staging, unstaging, and discarding
- Hunk and file operations
- Log view with graph visualization
- Status and diff for each commit
- Easy on the eyes dark mode

## How To Use

```
# Clone this repository
$ git clone https://github.com/jhs67/gwitch

# Go into the repository
$ cd gwitch

# Install dependencies
$ npm install

# Run the app
$ npm run dev
```

The app is developed using electron-vite and there is support for creating various
installer packages. Try `npm run build` to create the packages for your platform.

## Download

I hope to publish releases via github soon.

## Credits

The basic design and functionality was borrowed from [GitX-dev](https://rowanj.github.io/gitx/).
Sadly that software is only for MacOS and was abandoned long ago.

This software uses these open source packages:

- [Electron](http://electron.atom.io/)
- [Electron Vite](https://electron-vite.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)

And more! Check the [package.json](package.json).

## License

ISC © Jon Spencer
