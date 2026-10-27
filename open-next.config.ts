import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
	// R2 caching is off until the "aramevents-opennext-cache" bucket exists (see wrangler.jsonc).
	// See https://opennext.js.org/cloudflare/caching
	// incrementalCache: r2IncrementalCache,
});
