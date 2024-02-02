import { createHash } from "crypto";
import path from "path";
import favicons, { type FaviconImage, type FaviconResponse } from "favicons";
import type { FaviconOptions } from "favicons";
import { readFile } from "fs/promises";
import mime from "mime-types";
import type { Plugin } from "vite";

type Rewrite = [string, string];

type PluginContext = {
    command: "build" | "serve";
    sourceHash: string;
    response: FaviconResponse;
    rewriteMap: Rewrite[];
};

const rewriteImageName = (image: FaviconImage, sourceHash: string): string => {
    const extname = path.extname(image.name);
    const basename = path.basename(image.name, extname);
    return `assets/${basename}-${sourceHash}${extname}`;
};

const rewritePaths = (contents: string, rewriteMap: Rewrite[]): string => {
    let result = contents;

    for (const rewrite of rewriteMap) {
        result = result.replace(rewrite[0], rewrite[1]);
    }

    return result;
};

const transformIndexHtmlHook = (pluginContext: PluginContext, html: string): string => {
    const { html: tags } = pluginContext.response;

    const rewrittenTags = tags.map((element) => {
        const rewrite = pluginContext.rewriteMap.find((rewrite) => element.includes(rewrite[0]));

        if (!rewrite) {
            return element;
        }

        return element.replace(rewrite[0], rewrite[1]);
    });

    return html.replace(/<\/head>/, `${rewrittenTags.join("\n  ")}\n$&`);
};

const hashedFaviconsPlugin = (
    sourcePath: string,
    options: Omit<FaviconOptions, "path">,
): Plugin => {
    let pluginContext: PluginContext | undefined;

    return {
        name: "hashed-favicons",
        async configResolved(config) {
            const source = await readFile(sourcePath);
            const sourceHash = createHash("md5").update(source).digest("base64url");
            const response = await favicons(source, { ...options, path: "/" });
            const rewriteMap = response.images.map((image): Rewrite => {
                return [`/${image.name}`, `/${rewriteImageName(image, sourceHash)}`];
            });

            pluginContext = {
                command: config.command,
                sourceHash,
                response,
                rewriteMap,
            };
        },
        configureServer(server) {
            if (!pluginContext) {
                throw new Error("Plugin context has not been defined");
            }

            const rewriteMap = pluginContext.rewriteMap;

            for (const file of pluginContext.response.files) {
                server.middlewares.use(`/${file.name}`, (_req, res) => {
                    res.setHeader(
                        "Content-Type",
                        mime.lookup(file.name) || "application/octet-stream",
                    );
                    res.writeHead(200);
                    res.write(rewritePaths(file.contents, rewriteMap));
                    res.end();
                });
            }

            for (const image of pluginContext.response.images) {
                server.middlewares.use(
                    `/${rewriteImageName(image, pluginContext.sourceHash)}`,
                    (_req, res, next) => {
                        res.setHeader(
                            "Content-Type",
                            mime.lookup(image.name) || "application/octet-stream",
                        );
                        res.writeHead(200);
                        res.write(image.contents);
                        res.end();
                    },
                );
            }
        },
        transformIndexHtml(html) {
            if (!pluginContext) {
                throw new Error("Plugin context has not been defined");
            }

            return transformIndexHtmlHook(pluginContext, html);
        },
        async generateBundle() {
            if (!pluginContext) {
                throw new Error("Plugin context has not been defined");
            }

            if (pluginContext.command !== "build") {
                return;
            }

            for (const file of pluginContext.response.files) {
                this.emitFile({
                    type: "asset",
                    fileName: file.name,
                    source: rewritePaths(file.contents, pluginContext.rewriteMap),
                });
            }

            for (const image of pluginContext.response.images) {
                this.emitFile({
                    type: "asset",

                    fileName: rewriteImageName(image, pluginContext.sourceHash),
                    source: image.contents,
                });
            }
        },
    };
};

export default hashedFaviconsPlugin;
