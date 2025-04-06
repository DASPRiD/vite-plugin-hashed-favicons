import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { generateIco } from "../src/ico.js";

describe("ico", () => {
    it("should generate valid ico", async (t) => {
        const source = sharp(
            await readFile(fileURLToPath(new URL("./fixtures/icon.svg", import.meta.url))),
        );
        const ico = await generateIco([source]);

        t.assert.snapshot(ico);
    });
});
