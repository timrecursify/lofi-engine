import * as universal from '../entries/pages/admin/content/_page.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/content/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/admin/content/+page.ts";
export const imports = ["_app/immutable/nodes/6.ca0627f4.js","_app/immutable/chunks/auth.f71b9b0e.js","_app/immutable/chunks/preload-helper.a4192956.js","_app/immutable/chunks/singletons.d21bb060.js","_app/immutable/chunks/index.2134bd16.js","_app/immutable/chunks/paths.410cf5de.js","_app/immutable/chunks/environment.07c54b58.js","_app/immutable/chunks/Icon.ad00e24a.js","_app/immutable/chunks/ErrorBoundary.72e334de.js","_app/immutable/chunks/index.40b40403.js","_app/immutable/chunks/api-monitor.9e1d0df2.js","_app/immutable/chunks/logger.aad4d6ca.js"];
export const stylesheets = ["_app/immutable/assets/Icon.e584026b.css","_app/immutable/assets/ErrorBoundary.5269d388.css"];
export const fonts = [];
