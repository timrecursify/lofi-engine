import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.de0eb82d.js","_app/immutable/chunks/index.2134bd16.js","_app/immutable/chunks/auth.f71b9b0e.js","_app/immutable/chunks/preload-helper.a4192956.js","_app/immutable/chunks/singletons.d21bb060.js","_app/immutable/chunks/paths.410cf5de.js","_app/immutable/chunks/environment.07c54b58.js","_app/immutable/chunks/stores.73d5905e.js"];
export const stylesheets = ["_app/immutable/assets/0.98bcf38a.css"];
export const fonts = [];
