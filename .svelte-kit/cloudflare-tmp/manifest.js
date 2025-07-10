export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["assets/background/bg1.jpg","assets/background/bg10.jpg","assets/background/bg2.jpg","assets/background/bg3.jpg","assets/background/bg4.jpg","assets/background/bg5.jpg","assets/background/bg6.jpg","assets/background/bg7.jpg","assets/background/bg8.jpg","assets/background/bg9.jpg","assets/engine/DrumSamples/hat.mp3","assets/engine/DrumSamples/kick.mp3","assets/engine/DrumSamples/snare.mp3","assets/engine/PianoSamples/A1v1.mp3","assets/engine/PianoSamples/A1v3.mp3","assets/engine/PianoSamples/A2v1.mp3","assets/engine/PianoSamples/A2v3.mp3","assets/engine/PianoSamples/A3v1.mp3","assets/engine/PianoSamples/A3v3.mp3","assets/engine/PianoSamples/A4v1.mp3","assets/engine/PianoSamples/A4v3.mp3","assets/engine/PianoSamples/A5v1.mp3","assets/engine/PianoSamples/A5v3.mp3","assets/engine/PianoSamples/A6v1.mp3","assets/engine/PianoSamples/A6v3.mp3","assets/engine/PianoSamples/C1v1.mp3","assets/engine/PianoSamples/C1v3.mp3","assets/engine/PianoSamples/C2v1.mp3","assets/engine/PianoSamples/C2v3.mp3","assets/engine/PianoSamples/C3v1.mp3","assets/engine/PianoSamples/C3v3.mp3","assets/engine/PianoSamples/C4v1.mp3","assets/engine/PianoSamples/C4v3.mp3","assets/engine/PianoSamples/C5v1.mp3","assets/engine/PianoSamples/C5v3.mp3","assets/engine/PianoSamples/C6v1.mp3","assets/engine/PianoSamples/C6v3.mp3","assets/engine/PianoSamples/Dsharp1v1.mp3","assets/engine/PianoSamples/Dsharp1v3.mp3","assets/engine/PianoSamples/Dsharp2v1.mp3","assets/engine/PianoSamples/Dsharp2v3.mp3","assets/engine/PianoSamples/Dsharp3v1.mp3","assets/engine/PianoSamples/Dsharp3v3.mp3","assets/engine/PianoSamples/Dsharp4v1.mp3","assets/engine/PianoSamples/Dsharp4v3.mp3","assets/engine/PianoSamples/Dsharp5v1.mp3","assets/engine/PianoSamples/Dsharp5v3.mp3","assets/engine/PianoSamples/Dsharp6v1.mp3","assets/engine/PianoSamples/Dsharp6v3.mp3","assets/engine/PianoSamples/Fsharp1v1.mp3","assets/engine/PianoSamples/Fsharp1v3.mp3","assets/engine/PianoSamples/Fsharp2v1.mp3","assets/engine/PianoSamples/Fsharp2v3.mp3","assets/engine/PianoSamples/Fsharp3v1.mp3","assets/engine/PianoSamples/Fsharp3v3.mp3","assets/engine/PianoSamples/Fsharp4v1.mp3","assets/engine/PianoSamples/Fsharp4v3.mp3","assets/engine/PianoSamples/Fsharp5v1.mp3","assets/engine/PianoSamples/Fsharp5v3.mp3","assets/engine/PianoSamples/Fsharp6v1.mp3","assets/engine/PianoSamples/Fsharp6v3.mp3","assets/engine/effects/fire.mp3","assets/engine/effects/jungle.mp3","assets/engine/effects/rain.mp3","assets/engine/effects/thunder.mp3","assets/engine/tracks/Wind-Mark_DiAngelo-1940285615.mp3","assets/engine/tracks/city-ambience-9272.mp3","assets/engine/tracks/night-ambience-17064.mp3","assets/engine/tracks/office-ambience-6322.mp3","assets/engine/tracks/old-server-turning-on-and-off-24540.mp3","assets/engine/tracks/small-waves-onto-the-sand-143040.mp3","assets/engine/tracks/train-to-munich-germany.mp3","assets/engine/tracks/underwater-white-noise-46423.mp3","assets/engine/tracks/urban-seagulls-30068.mp3","favicon.ico","rain.png","sw.js","voice/educate.mp3","voice/news.mp3","voice/weather.mp3"]),
	mimeTypes: {".jpg":"image/jpeg",".mp3":"audio/mpeg",".png":"image/png",".js":"application/javascript"},
	_: {
		client: {"start":"_app/immutable/entry/start.52fafa50.js","app":"_app/immutable/entry/app.7f514d0e.js","imports":["_app/immutable/entry/start.52fafa50.js","_app/immutable/chunks/index.2134bd16.js","_app/immutable/chunks/singletons.d21bb060.js","_app/immutable/chunks/paths.410cf5de.js","_app/immutable/chunks/control.c2cf8273.js","_app/immutable/entry/app.7f514d0e.js","_app/immutable/chunks/preload-helper.a4192956.js","_app/immutable/chunks/index.2134bd16.js"],"stylesheets":[],"fonts":[]},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js')),
			__memo(() => import('../output/server/nodes/4.js')),
			__memo(() => import('../output/server/nodes/5.js')),
			__memo(() => import('../output/server/nodes/6.js')),
			__memo(() => import('../output/server/nodes/7.js')),
			__memo(() => import('../output/server/nodes/8.js')),
			__memo(() => import('../output/server/nodes/9.js')),
			__memo(() => import('../output/server/nodes/10.js')),
			__memo(() => import('../output/server/nodes/11.js')),
			__memo(() => import('../output/server/nodes/12.js')),
			__memo(() => import('../output/server/nodes/13.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/admin/analytics",
				pattern: /^\/admin\/analytics\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/admin/content",
				pattern: /^\/admin\/content\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/admin/health",
				pattern: /^\/admin\/health\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/admin/settings",
				pattern: /^\/admin\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/admin/users",
				pattern: /^\/admin\/users\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/api/user/preferences",
				pattern: /^\/api\/user\/preferences\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/user/preferences/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/analytics",
				pattern: /^\/api\/v1\/admin\/analytics\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/analytics/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/content/clips",
				pattern: /^\/api\/v1\/admin\/content\/clips\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/content/clips/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/content/generate",
				pattern: /^\/api\/v1\/admin\/content\/generate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/content/generate/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/content/queue",
				pattern: /^\/api\/v1\/admin\/content\/queue\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/content/queue/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/content/sources",
				pattern: /^\/api\/v1\/admin\/content\/sources\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/content/sources/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/content/sources/[id]/toggle",
				pattern: /^\/api\/v1\/admin\/content\/sources\/([^/]+?)\/toggle\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/content/sources/_id_/toggle/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/feature-flags",
				pattern: /^\/api\/v1\/admin\/feature-flags\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/feature-flags/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/health",
				pattern: /^\/api\/v1\/admin\/health\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/health/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/health/alerts",
				pattern: /^\/api\/v1\/admin\/health\/alerts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/health/alerts/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/health/alerts/[id]/acknowledge",
				pattern: /^\/api\/v1\/admin\/health\/alerts\/([^/]+?)\/acknowledge\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/health/alerts/_id_/acknowledge/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/health/alerts/[id]/resolve",
				pattern: /^\/api\/v1\/admin\/health\/alerts\/([^/]+?)\/resolve\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/health/alerts/_id_/resolve/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/metrics",
				pattern: /^\/api\/v1\/admin\/metrics\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/metrics/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/users",
				pattern: /^\/api\/v1\/admin\/users\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/users/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/users/[id]/ban",
				pattern: /^\/api\/v1\/admin\/users\/([^/]+?)\/ban\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/users/_id_/ban/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/users/[id]/impersonate",
				pattern: /^\/api\/v1\/admin\/users\/([^/]+?)\/impersonate\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/users/_id_/impersonate/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/users/[id]/reset-trial",
				pattern: /^\/api\/v1\/admin\/users\/([^/]+?)\/reset-trial\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/users/_id_/reset-trial/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/users/[id]/subscription",
				pattern: /^\/api\/v1\/admin\/users\/([^/]+?)\/subscription\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/users/_id_/subscription/_server.ts.js'))
			},
			{
				id: "/api/v1/admin/users/[id]/unban",
				pattern: /^\/api\/v1\/admin\/users\/([^/]+?)\/unban\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/admin/users/_id_/unban/_server.ts.js'))
			},
			{
				id: "/api/v1/auth/magic-link",
				pattern: /^\/api\/v1\/auth\/magic-link\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/auth/magic-link/_server.ts.js'))
			},
			{
				id: "/api/v1/checkout/session",
				pattern: /^\/api\/v1\/checkout\/session\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/checkout/session/_server.ts.js'))
			},
			{
				id: "/api/v1/clip/[id]",
				pattern: /^\/api\/v1\/clip\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/clip/_id_/_server.ts.js'))
			},
			{
				id: "/api/v1/cron/cleanup",
				pattern: /^\/api\/v1\/cron\/cleanup\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/cron/cleanup/_server.ts.js'))
			},
			{
				id: "/api/v1/cron/content-generation",
				pattern: /^\/api\/v1\/cron\/content-generation\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/cron/content-generation/_server.ts.js'))
			},
			{
				id: "/api/v1/feature-flags",
				pattern: /^\/api\/v1\/feature-flags\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/feature-flags/_server.ts.js'))
			},
			{
				id: "/api/v1/queue",
				pattern: /^\/api\/v1\/queue\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/queue/_server.ts.js'))
			},
			{
				id: "/api/v1/test/content-pipeline",
				pattern: /^\/api\/v1\/test\/content-pipeline\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/test/content-pipeline/_server.ts.js'))
			},
			{
				id: "/api/v1/test/payment-flow",
				pattern: /^\/api\/v1\/test\/payment-flow\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/test/payment-flow/_server.ts.js'))
			},
			{
				id: "/api/v1/user/subscription",
				pattern: /^\/api\/v1\/user\/subscription\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/user/subscription/_server.ts.js'))
			},
			{
				id: "/api/v1/webhooks/clerk",
				pattern: /^\/api\/v1\/webhooks\/clerk\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/webhooks/clerk/_server.ts.js'))
			},
			{
				id: "/api/v1/webhooks/stripe",
				pattern: /^\/api\/v1\/webhooks\/stripe\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/v1/webhooks/stripe/_server.ts.js'))
			},
			{
				id: "/auth/callback",
				pattern: /^\/auth\/callback\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/auth/error",
				pattern: /^\/auth\/error\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/auth/signin",
				pattern: /^\/auth\/signin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/upgrade",
				pattern: /^\/upgrade\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
}
})();

export const prerendered = new Set([]);
