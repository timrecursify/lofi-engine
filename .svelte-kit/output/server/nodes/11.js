

export const index = 11;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/auth/error/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/11.775621b1.js","_app/immutable/chunks/index.2134bd16.js","_app/immutable/chunks/paths.410cf5de.js"];
export const stylesheets = [];
export const fonts = [];
