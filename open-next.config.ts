import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

const config = defineCloudflareConfig({
	// R2 caching is off until the "aramevents-opennext-cache" bucket exists (see wrangler.jsonc).
	// See https://opennext.js.org/cloudflare/caching
	// incrementalCache: r2IncrementalCache,
});

export default {
	...config,
	// `npm run build` runs `opennextjs-cloudflare build` (so Cloudflare's build command produces the
	// Worker in .open-next/). OpenNext must then run the Next.js build itself directly, not through
	// `npm run build`, or it would call itself. The tesseract copy is the old `prebuild` step.
	buildCommand: "node scripts/copy-tesseract.cjs && npx next build",
};
