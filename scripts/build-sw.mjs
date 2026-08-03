// Compiles the service worker (src/app/sw.ts) into public/sw.js standalone,
// bypassing Next's bundler entirely. See src/app/sw.ts for why.
import { build } from "esbuild";

await build({
  entryPoints: ["src/app/sw.ts"],
  outfile: "public/sw.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  platform: "browser",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
});
