declare module "virtual:hashed-favicons" {
    type Icons = [
        {
            rel: "manifest";
            href: "/manifest.webmanifest";
        },
        {
            rel: "icon";
            href: "/favicon.ico";
            sizes: "32x32";
        },
        {
            rel: "icon";
            type: "image/svg+xml";
            href: `/${string}.svg`;
        },
        {
            rel: "apple-touch-icon";
            href: `/${string}.png`;
        },
    ];

    const icons: Icons;
    export default icons;
}
