export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13')
];

export const server_loads = [0,2];

export const dictionary = {
		"/": [3],
		"/admin": [4,[2]],
		"/admin/analytics": [5,[2]],
		"/admin/content": [6,[2]],
		"/admin/health": [7,[2]],
		"/admin/settings": [8,[2]],
		"/admin/users": [9,[2]],
		"/auth/callback": [10],
		"/auth/error": [11],
		"/auth/signin": [12],
		"/upgrade": [13]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
};

export { default as root } from '../root.svelte';