

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/3.6a09ad06.js","_app/immutable/chunks/index.2134bd16.js","_app/immutable/chunks/stores.73d5905e.js","_app/immutable/chunks/singletons.d21bb060.js","_app/immutable/chunks/paths.410cf5de.js","_app/immutable/chunks/auth.f71b9b0e.js","_app/immutable/chunks/preload-helper.a4192956.js","_app/immutable/chunks/environment.07c54b58.js","_app/immutable/chunks/Icon.ad00e24a.js","_app/immutable/chunks/stores.97297f88.js","_app/immutable/chunks/index.40b40403.js"];
export const stylesheets = ["_app/immutable/assets/3.fa3342aa.css","_app/immutable/assets/Icon.e584026b.css"];
export const fonts = [];
