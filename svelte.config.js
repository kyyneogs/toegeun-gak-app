import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// 1차 배포는 Vercel Functions. GTFS 전국 피드는 함수 디스크에 올리지 않습니다.
		adapter: adapter()
	}
};

export default config;
