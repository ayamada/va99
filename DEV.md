# Development

1. Clone this repos and `git checkout dev`
2. `npm i` or `npm ci`, and `npm outdated`
3. Edit **`src/va99.js`** and `docs/index.html`
    - `docs/va99.js` and `dist/va99.js` are **generated** from `src/va99.js`. DO NOT EDIT THESE
4. Run `npm run http` (and `npm run watch` in another terminal, if you want auto generation)
5. Open `http://127.0.0.1:3000/` and check
6. Run `npm test` (node tests and browser tests)
    - browser tests need browsers of playwright, so run `npm run install:browsers` at first, in a new environment
7. Edit version in `package.json` if need
8. Run `npm run make` to make `dist/va99.*`
    - this updates the version in `package.json` and `src/va99.js`, and generates `docs/va99.js` and `dist/va99.js`, before minifying
9. Edit `docs/index.html` and `CHANGELOG.md` to append changes, and commit
10. Release and deploy if need
    - `npm publish`
    - `git tag -s v$(jq -r .version package.json) -m ''`
    - `git push && git push origin --tags`
11. Merge to master branch in https://github.com/ayamada/va99

