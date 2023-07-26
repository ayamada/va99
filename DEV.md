# Development

1. Clone this repos and `git checkout dev`
2. `npm i` or `npm ci`, and `npm outdated`
3. Edit `docs/va99.js` and `docs/index.html`
4. Run `npm run http`
5. Open `http://127.0.0.1:3000/` and check
6. Edit version in `package.json` if need
7. Run `npm run make` to make `va99.min.js` and `va99.min.mjs`
8. Edit `docs/index.html` and `README.md` to append changes, and commit
9. Release and deploy if need
    - `npm publish`
    - `git tag -s v$(jq -r .version package.json) -m ''`
    - `git push && git push origin --tags`
10. Merge to master branch in https://github.com/ayamada/va99




