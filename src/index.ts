import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { Plugin } from "vite";
import { generateIco } from "./ico.js";

type Variant = {
    data: Buffer;
    filePath: string;
    mimeType: string;
};

type Variants = {
    svg: Variant;
    ico: Variant;
    png512: Variant;
    png192: Variant;
    pngMasked: Variant;
    appleTouch: Variant;
};

type PluginContext = {
    command: "build" | "serve";
    variants: Variants;
    webManifest: string;
};

const createVariants = async (source: Buffer): Promise<Variants> => {
    const sourceHash = createHash("md5").update(source).digest("base64url");
    const image = sharp(source);

    return {
        svg: {
            data: source,
            filePath: `/assets/favicon-${sourceHash}.svg`,
            mimeType: "image/svg+xml",
        },
        ico: {
            data: await generateIco([image.clone().resize(32, 32)]),
            filePath: "/favicon.ico",
            mimeType: "image/x-icon",
        },
        png512: {
            data: await image.clone().resize(512, 512).toFormat("png").toBuffer(),
            filePath: `/assets/favicon-512-${sourceHash}.png`,
            mimeType: "image/png",
        },
        png192: {
            data: await image.clone().resize(192, 192).toFormat("png").toBuffer(),
            filePath: `/assets/favicon-192-${sourceHash}.png`,
            mimeType: "image/png",
        },
        pngMasked: {
            data: await image
                .clone()
                .resize(408, 408)
                .extend({
                    top: 52,
                    bottom: 52,
                    left: 52,
                    right: 52,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .toFormat("png")
                .toBuffer(),
            filePath: `/assets/favicon-192-${sourceHash}.png`,
            mimeType: "image/png",
        },
        appleTouch: {
            data: await image
                .clone()
                .resize(140, 140)
                .extend({
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .toFormat("png")
                .toBuffer(),
            filePath: `/assets/favicon-192-${sourceHash}.png`,
            mimeType: "image/png",
        },
    };
};

const createWebManifest = (
    base: Record<string, unknown>,
    variants: Variants,
): Record<string, unknown> => ({
    ...base,
    icons: [
        { src: variants.png192.filePath, sizes: "192x192" },
        { src: variants.pngMasked.filePath, sizes: "512x512", purpose: "maskable" },
        { src: variants.png512.filePath, sizes: "512x512" },
    ],
});

export type HashedFaviconsOptions = {
    webManifest?: Record<string, unknown>;
};

const hashedFaviconsPlugin = (sourcePath: string, options?: HashedFaviconsOptions): Plugin => {
    let pluginContext: PluginContext | undefined;

    return {
        name: "hashed-favicons",
        async configResolved(config) {
            const source = await readFile(sourcePath);
            const variants = await createVariants(source);
            const webManifest = JSON.stringify(
                createWebManifest(options?.webManifest ?? {}, variants),
                undefined,
                4,
            );

            pluginContext = {
                command: config.command,
                variants,
                webManifest,
            };
        },
        configureServer(server) {
            if (!pluginContext) {
                throw new Error("Plugin context has not been defined");
            }

            const { webManifest } = pluginContext;

            server.middlewares.use("/manifest.webmanifest", (_req, res) => {
                res.setHeader("Content-Type", "application/manifest+json");
                res.writeHead(200);
                res.write(webManifest);
                res.end();
            });

            for (const variant of Object.values(pluginContext.variants)) {
                server.middlewares.use(variant.filePath, (_req, res) => {
                    res.setHeader("Content-Type", variant.mimeType);
                    res.writeHead(200);
                    res.write(variant.data);
                    res.end();
                });
            }
        },
        transformIndexHtml(html) {
            if (!pluginContext) {
                throw new Error("Plugin context has not been defined");
            }

            const tags = [
                `<link rel="manifest" href="/manifest.webmanifest">`,
                `<link rel="icon" href="${pluginContext.variants.ico.filePath}" sizes="32x32">`,
                `<link rel="icon" type="image/svg+xml" href="${pluginContext.variants.svg.filePath}">`,
                `<link rel="apple-touch-icon" href="${pluginContext.variants.appleTouch.filePath}">`,
            ];

            return html.replace(/<\/head>/, `${tags.join("\n  ")}\n$&`);
        },
        async generateBundle() {
            if (!pluginContext) {
                throw new Error("Plugin context has not been defined");
            }

            if (pluginContext.command !== "build") {
                return;
            }

            for (const variant of Object.values(pluginContext.variants)) {
                this.emitFile({
                    type: "asset",
                    fileName: variant.filePath,
                    source: variant.data,
                });
            }

            this.emitFile({
                type: "asset",
                fileName: "/manifest.webmanifest",
                source: pluginContext.webManifest,
            });
        },
    };
};

export default hashedFaviconsPlugin;
