# Vite Plugin for hashed favicons

[![Release](https://github.com/DASPRiD/mikro-orm-js-joda/actions/workflows/release.yml/badge.svg)](https://github.com/DASPRiD/vite-plugin-hashed-favicons/actions/workflows/release.yml)

A simple vite plugin to generate favicons from a single source SVG.

This plugin follows the methodology described in this blog post:
https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs

To break it down:

- You should have an optimized SVG file, ideally with dark/light support built in.
- The plugin generates an `ico` with size of 32x32
- It also generates the most common `png` variants, including masked
- It will generate a basic web manifest, which can be extended.
- The `favicon.ico` and `manifest.webmanifest` live in root, while all other assets get hashed under `/assets`.

## Installation

### npm
```bash
npm i vite-plugin-hashed-favicons
```

### pnpm
```bash
pnpm add vite-plugin-hashed-favicons
```

## Usage

In your `vite.config.ts`:

```typescript
import favicons from "vite-plugin-hashed-favicons";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        favicons("./src/assets/favicon.svg", {
            webManifest: {/* Your own web manifest settings */}
        }),
    ],
});
```
