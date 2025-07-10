import{c as y,s as k,v as c,m as d}from"./index3.js";let g="",u=g;const h={base:g,assets:u};function b(){g=h.base,u=h.assets}function P(n){u=h.assets=n}let x={},E={};function L(n){x=n}function C(n){E=n}function R(){}const S=y((n,t,e,w)=>{let{stores:s}=t,{page:f}=t,{constructors:a}=t,{components:o=[]}=t,{form:l}=t,{data_0:v=null}=t,{data_1:m=null}=t,{data_2:_=null}=t;k("__svelte__",s),s.page.notify,t.stores===void 0&&e.stores&&s!==void 0&&e.stores(s),t.page===void 0&&e.page&&f!==void 0&&e.page(f),t.constructors===void 0&&e.constructors&&a!==void 0&&e.constructors(a),t.components===void 0&&e.components&&o!==void 0&&e.components(o),t.form===void 0&&e.form&&l!==void 0&&e.form(l),t.data_0===void 0&&e.data_0&&v!==void 0&&e.data_0(v),t.data_1===void 0&&e.data_1&&m!==void 0&&e.data_1(m),t.data_2===void 0&&e.data_2&&_!==void 0&&e.data_2(_);let r,p;do r=!0,s.page.set(f),p=`



${a[1]?`${c(a[0]||d,"svelte:component").$$render(n,{data:v,this:o[0]},{this:i=>{o[0]=i,r=!1}},{default:()=>`${a[2]?`${c(a[1]||d,"svelte:component").$$render(n,{data:m,this:o[1]},{this:i=>{o[1]=i,r=!1}},{default:()=>`${c(a[2]||d,"svelte:component").$$render(n,{data:_,form:l,this:o[2]},{this:i=>{o[2]=i,r=!1}},{})}`})}`:`${c(a[1]||d,"svelte:component").$$render(n,{data:m,form:l,this:o[1]},{this:i=>{o[1]=i,r=!1}},{})}`}`})}`:`${c(a[0]||d,"svelte:component").$$render(n,{data:v,form:l,this:o[0]},{this:i=>{o[0]=i,r=!1}},{})}`}

`;while(!r);return p}),O={app_template_contains_nonce:!1,csp:{mode:"auto",directives:{"upgrade-insecure-requests":!1,"block-all-mixed-content":!1},reportOnly:{"upgrade-insecure-requests":!1,"block-all-mixed-content":!1}},csrf_check_origin:!0,track_server_fetches:!1,embedded:!1,env_public_prefix:"PUBLIC_",env_private_prefix:"",hooks:null,preload_strategy:"modulepreload",root:S,service_worker:!1,templates:{app:({head:n,body:t,assets:e,nonce:w,env:s})=>`<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="`+e+`/favicon.ico" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="theme-color" content="#191414" />
		<meta name="description" content="Lo-Fi Radio - Procedural lo-fi music with AI-voiced information clips" />
		<title>Lo-Fi Radio</title>
		`+n+`
	</head>
	<body data-sveltekit-preload-data="hover" class="bg-[#191414] text-white overflow-hidden">
		<div style="display: contents">`+t+`</div>
		<script>
			// Initialize Clerk environment for frontend
			window.CLERK_ENVIRONMENT = {
				publishableKey: '%env.PUBLIC_CLERK_PUBLISHABLE_KEY%'
			};
			
			// Initialize PostHog analytics configuration
			window.__POSTHOG_API_KEY__ = '%env.PUBLIC_POSTHOG_API_KEY%';
			
			// Initialize Sentry error monitoring configuration
			window.__SENTRY_DSN__ = '%env.PUBLIC_SENTRY_DSN%';
		<\/script>
		<script>
			// Disable service worker in development
			if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
				window.addEventListener('load', () => {
					navigator.serviceWorker.register('/sw.js')
						.then((registration) => {
							console.log('SW registered: ', registration);
						})
						.catch((registrationError) => {
							console.log('SW registration failed: ', registrationError);
						});
				});
			} else if ('serviceWorker' in navigator && window.location.hostname === 'localhost') {
				// Unregister any existing service worker in development
				navigator.serviceWorker.getRegistrations().then(function(registrations) {
					for(let registration of registrations) {
						registration.unregister();
						console.log('SW unregistered for development');
					}
				});
			}
		<\/script>
	</body>
</html> `,error:({status:n,message:t})=>`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>`+t+`</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">`+n+`</span>
			<div class="message">
				<h1>`+t+`</h1>
			</div>
		</div>
	</body>
</html>
`},version_hash:"607r1"};function U(){return import("./hooks.server.js")}export{u as a,g as b,C as c,x as d,P as e,R as f,U as g,O as o,E as p,b as r,L as s};
