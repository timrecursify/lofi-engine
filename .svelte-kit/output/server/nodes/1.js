

export const index = 1;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/fallbacks/error.svelte.js')).default;
export const imports = ["_app/immutable/nodes/1.f6ee99e2.js","_app/immutable/chunks/index.2134bd16.js","_app/immutable/chunks/stores.73d5905e.js","_app/immutable/chunks/singletons.d21bb060.js","_app/immutable/chunks/paths.410cf5de.js"];
export const stylesheets = [];
export const fonts = [];
