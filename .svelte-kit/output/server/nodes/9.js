

export const index = 9;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/users/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/9.0c9c3aa2.js","_app/immutable/chunks/index.2134bd16.js","_app/immutable/chunks/paths.410cf5de.js","_app/immutable/chunks/Icon.ad00e24a.js"];
export const stylesheets = ["_app/immutable/assets/9.b875bc3d.css","_app/immutable/assets/Icon.e584026b.css"];
export const fonts = [];
