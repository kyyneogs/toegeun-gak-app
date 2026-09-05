import { env } from '$env/dynamic/private';
import webpush from 'web-push';

export interface VapidKeyPair {
	publicKey: string;
	privateKey: string;
	subject: string;
}

let generated: { publicKey: string; privateKey: string } | null = null;

export function getVapidKeys(): VapidKeyPair | null {
	const publicKey = env.VAPID_PUBLIC_KEY?.trim() || generated?.publicKey;
	const privateKey = env.VAPID_PRIVATE_KEY?.trim() || generated?.privateKey;

	if (publicKey && privateKey) {
		return {
			publicKey,
			privateKey,
			subject: env.VAPID_SUBJECT?.trim() || 'mailto:noreply@localhost'
		};
	}

	if (process.env.NODE_ENV === 'production') {
		return null;
	}

	generated = webpush.generateVAPIDKeys();
	return {
		publicKey: generated.publicKey,
		privateKey: generated.privateKey,
		subject: 'mailto:noreply@localhost'
	};
}
