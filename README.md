# geomac

Geomac is a small monochrome rock machine. It creates repeatable 2.5D vector rocks from a restrained set of discrete controls.

The current model is material-first:

- `Form`: monolith, shard, ridge, or quarry
- `Fracture`: number and weight of surface cracks
- `Strata`: horizontal sediment lines
- `Erode`: silhouette roughness
- `Light`: tonal direction across facets
- `Grain`: surface texture density
- `Size`: export dimension

The controls use Base UI's unstyled React primitives, with all visual styling owned by this project. The output can be copied as SVG or exported as SVG/PNG.

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
