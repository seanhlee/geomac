# geomac

Geomac is a small monochrome vector construction instrument. It creates repeatable geometric studies from one system, one primitive mark, and a few discrete constraints.

The current model is system-first:

- `System`: radial, rail, stack, or field
- `Mark`: block, wedge, dot, or line
- `Level`: structural complexity
- `Phase`: rotation or offset
- `Size`: export dimension

The controls use Base UI's unstyled React primitives, with all visual styling owned by this project.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Publish

The repository includes a GitHub Pages workflow. Pushing to `main` builds and deploys the app to:

```text
https://seanhlee.github.io/geomac/
```
