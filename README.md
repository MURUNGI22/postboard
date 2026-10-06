# Postboard — JSONPlaceholder CRUD SPA

Requires Node.js 20.19+ or 22.12+. Run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` for a production build and `npm test` for the data-layer tests.

With the dev server running, `npm run visual-check` uses installed Chrome or Edge to exercise the login and SPA flows at desktop and mobile widths. It saves screenshots in the system temporary folder. Set `CHROME_PATH` if the browser is installed elsewhere.

The React single-page app loads posts from JSONPlaceholder, shows post details and comments, and sends POST, PUT, and DELETE requests for the matching actions. It includes search, sorting, eight-post pagination, responsive layouts, loading and error states, and keyboard-accessible form controls. GET results are cached in `sessionStorage` for five minutes; the refresh button bypasses that cache. Comments are cached in memory for five minutes. Post mutations use `localStorage` so the UI remains consistent after reload.

**API limitation:** [JSONPlaceholder simulates writes](https://jsonplaceholder.typicode.com/); it does not retain created, edited, or deleted posts on the server. Posts created in this app receive local IDs. Later edits and deletions of those new posts stay local, while edits and deletions of the original API posts use PUT and DELETE. Clear this site's local storage to reset the demo changes.
