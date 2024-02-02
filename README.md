# Vite Plugin for hashed favicons

[![Release](https://github.com/DASPRiD/mikro-orm-js-joda/actions/workflows/release.yml/badge.svg)](https://github.com/DASPRiD/vite-plugin-hashed-favicons/actions/workflows/release.yml)

This plugins provides [favicons](https://github.com/itgalaxy/favicons/tree/master) support for Vite.

In contrast to other plugins it adds hashes to all images based on the source file and places them under `/assets`,
while keeping all manifest files under the root.

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
            // See "favicons" package configuration
        }),
    ],
});
```
