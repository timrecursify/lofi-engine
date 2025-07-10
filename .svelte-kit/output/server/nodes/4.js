

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/4.5235b305.js","_app/immutable/chunks/preload-helper.a4192956.js","_app/immutable/chunks/index.2134bd16.js","_app/immutable/chunks/Icon.ad00e24a.js","_app/immutable/chunks/analytics.430c225b.js","_app/immutable/chunks/environment.07c54b58.js"];
export const stylesheets = ["_app/immutable/assets/4.da249191.css","_app/immutable/assets/Icon.e584026b.css"];
export const fonts = [];
