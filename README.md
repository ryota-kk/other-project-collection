# Other Project Collection

A selected-work site for three projects: Visual Draft Editor, Bitmap to Vector Tool, and an anonymized client esports data interface. Built with React and Vite. The client project is represented by approved visual material and a general description; customer source code and business data are not included.

## Pages

- `/` - three-project showcase
- `/vector` - bitmap-to-SVG tool frontend
- `/history` and `/result/...` - tool history and result views

The vector tool's API is not included in this repository. Its backend remains in the [svg.tool repository](https://github.com/ryota-kk/svg.tool). The showcase itself works without an API; conversion, history, and downloads require a reachable backend.

## Local development

```bash
npm ci
npm run dev
```

To use the vector tool locally, copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend URL (for example, `http://localhost:8000`). Start the backend separately from the `svg.tool` repository.

## Build and test

```bash
npm run build
npm run preview
npm run test:ui
```

## Deploy to Vercel

Import this repository with the **Vite** preset. Use the repository root (`./`), `npm ci` for installation, `npm run build` for the build, and `dist` for output. `vercel.json` rewrites frontend routes to `index.html`.

Set `VITE_API_BASE_URL` in Vercel only if the vector tool frontend should call a separately deployed backend. It must be a publicly reachable backend URL, not `localhost`. If it is unset, the showcase remains available but the vector tool's API actions will not work on a static Vercel deployment. Vite embeds this value at build time, so redeploy after changing it.

No secret keys are required for the showcase. Do not commit `.env` files or backend credentials. A `VITE_` variable is public in the browser and must not contain a secret.
