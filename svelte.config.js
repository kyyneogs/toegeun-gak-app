import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// 1차 배포는 Vercel Functions. GTFS 전국 피드는 함수 디스크에 올리지 않습니다.
		// 로컬 Node 26은 어댑터 기본 런타임이 아니라 명시합니다.
		adapter: adapter({ runtime: 'nodejs22.x', regions: ['icn1'] })
	}
};

export default config;
