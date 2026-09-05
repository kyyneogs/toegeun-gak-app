import { STORAGE_KEYS } from '$lib/constants/storage-keys';
import { prefersReducedMotion } from '$lib/constants/motion';

class SplashSession {
	finished = $state(false);

	shouldPlay(): boolean {
		if (typeof window === 'undefined') {
			return false;
		}

		if (prefersReducedMotion()) {
			return false;
		}

		return sessionStorage.getItem(STORAGE_KEYS.SPLASH_SEEN) !== '1';
	}

	finish(persist = false): void {
		if (persist && typeof sessionStorage !== 'undefined') {
			sessionStorage.setItem(STORAGE_KEYS.SPLASH_SEEN, '1');
		}

		this.finished = true;
	}
}

export const splashSession = new SplashSession();
