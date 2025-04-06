import type { Sharp } from "sharp";

const HEADER_SIZE = 6;
const DIRECTORY_SIZE = 16;
const BITMAP_SIZE = 40;
const COLOR_MODE = 0;
const CHANNELS = 4;

const createHeader = (dataLength: number): Buffer => {
    const buffer = Buffer.alloc(HEADER_SIZE);

    buffer.writeUInt16LE(0, 0);
    buffer.writeUInt16LE(1, 2);
    buffer.writeUInt16LE(dataLength, 4);

    return buffer;
};

type Icon = {
    data: Buffer;
    width: number;
    height: number;
};

const createDirectory = (icon: Icon, offset: number): Buffer => {
    const buffer = Buffer.alloc(DIRECTORY_SIZE);
    const size = icon.data.length + BITMAP_SIZE;
    const width = icon.width === 256 ? 0 : icon.width;
    const height = icon.height === 256 ? 0 : icon.height;
    const bpp = CHANNELS * 8;

    buffer.writeUInt8(width, 0);
    buffer.writeUInt8(height, 1);
    buffer.writeUInt8(0, 2);
    buffer.writeUInt8(0, 3);
    buffer.writeUInt16LE(1, 4);
    buffer.writeUInt16LE(bpp, 6);
    buffer.writeUInt32LE(size, 8);
    buffer.writeUInt32LE(offset, 12);

    return buffer;
};

const createBitmap = (icon: Icon, compression: number): Buffer => {
    const buffer = Buffer.alloc(BITMAP_SIZE);

    buffer.writeUInt32LE(BITMAP_SIZE, 0);
    buffer.writeInt32LE(icon.width, 4);
    buffer.writeInt32LE(icon.height * 2, 8);
    buffer.writeUInt16LE(1, 12);
    buffer.writeUInt16LE(CHANNELS * 8, 14);
    buffer.writeUInt32LE(compression, 16);
    buffer.writeUInt32LE(icon.data.length, 20);
    buffer.writeInt32LE(0, 24);
    buffer.writeInt32LE(0, 28);
    buffer.writeUInt32LE(0, 32);
    buffer.writeUInt32LE(0, 36);

    return buffer;
};

const createDib = ({ data, width, height }: Icon) => {
    const cols = width * CHANNELS;
    const rows = height * cols;
    const end = rows - cols;
    const buffer = Buffer.alloc(data.length);

    for (let row = 0; row < rows; row += cols) {
        for (let col = 0; col < cols; col += CHANNELS) {
            let pos = row + col;

            const r = data.readUInt8(pos);
            const g = data.readUInt8(pos + 1);
            const b = data.readUInt8(pos + 2);
            const a = data.readUInt8(pos + 3);

            pos = end - row + col;

            buffer.writeUInt8(b, pos);
            buffer.writeUInt8(g, pos + 1);
            buffer.writeUInt8(r, pos + 2);
            buffer.writeUInt8(a, pos + 3);
        }
    }

    return buffer;
};

export const generateIco = async (sources: Sharp[]): Promise<Buffer> => {
    const icons = await Promise.all(
        sources.map(async (source): Promise<Icon> => {
            const { data, info } = await source
                .ensureAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true });

            return {
                data,
                width: info.width,
                height: info.height,
            };
        }),
    );

    const header = createHeader(icons.length);
    const buffers: Buffer[] = [header];
    let offset = HEADER_SIZE + DIRECTORY_SIZE * icons.length;

    for (const icon of icons) {
        const directory = createDirectory(icon, offset);
        buffers.push(directory);
        offset += icon.data.length + BITMAP_SIZE;
    }

    for (const icon of icons) {
        const header = createBitmap(icon, COLOR_MODE);
        const dib = createDib(icon);
        buffers.push(header, dib);
    }

    return Buffer.concat(buffers);
};
