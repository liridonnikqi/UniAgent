import { building } from '$app/environment';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { APIError } from 'better-auth/api';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import pg from 'pg';

const origin = env.BETTER_AUTH_URL || 'http://localhost:5173';

function allowedEmail(email: string) {
	const domains = (env.AUTH_ALLOWED_DOMAINS || '')
		.split(',')
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);
	if (!domains.length) return true;
	const domain = email.split('@')[1]?.toLowerCase();
	return Boolean(domain && domains.includes(domain));
}

function senderAddress() {
	const raw = (env.EMAIL_FROM || '').trim();
	const email = raw.includes('<') ? raw.match(/<([^>]+)>/)?.[1]?.trim() : raw;
	const domain = email?.split('@')[1]?.toLowerCase() || '';
	if (
		!email ||
		!domain.includes('.') ||
		domain === 'localhost' ||
		domain.endsWith('.example.com') ||
		domain === 'example.com'
	) {
		return '';
	}
	return raw.includes('<') ? raw : `UniAgent <${raw}>`;
}

async function sendMagicLink({ email, url }: { email: string; url: string }) {
	console.log(url);

	const key = env.RESEND_API_KEY;
	const from = senderAddress();
	if (!key || !from) return;

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from,
			to: email,
			subject: 'Hyr në UniAgent',
			html: `<p>Hap këtë lidhje për të hyrë në UniAgent:</p><p><a href="${url}">${url}</a></p><p>Skadon pas 5 minutash.</p>`
		})
	});

	if (!res.ok) {
		console.error(await res.text());
	}
}

const googleId = env.GOOGLE_CLIENT_ID || '';
const googleSecret = env.GOOGLE_CLIENT_SECRET || '';
const microsoftId = env.MICROSOFT_CLIENT_ID || '';
const microsoftSecret = env.MICROSOFT_CLIENT_SECRET || '';

export const authEnabled = {
	google: Boolean(googleId && googleSecret),
	microsoft: Boolean(microsoftId && microsoftSecret)
};

let pool: pg.Pool | undefined;

function authPool() {
	if (!env.DATABASE_URL) {
		throw new Error('Missing DATABASE_URL in .env');
	}
	if (!pool) {
		pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 5 });
	}
	return pool;
}

export const auth = betterAuth({
	baseURL: origin,
	secret: env.BETTER_AUTH_SECRET || 'uniagent-dev-secret-change-me-32chars',
	database: authPool(),
	trustedOrigins: [origin],
	emailAndPassword: { enabled: false },
	accountLinking: {
		enabled: true,
		trustedProviders: ['google', 'microsoft']
	},
	user: {
		modelName: 'users',
		fields: {
			emailVerified: 'email_verified',
			createdAt: 'created_at',
			updatedAt: 'updated_at'
		},
		additionalFields: {
			university: {
				type: 'string',
				required: false,
				input: false
			}
		}
	},
	session: {
		modelName: 'auth_session',
		fields: {
			userId: 'user_id',
			expiresAt: 'expires_at',
			ipAddress: 'ip_address',
			userAgent: 'user_agent',
			createdAt: 'created_at',
			updatedAt: 'updated_at'
		}
	},
	account: {
		modelName: 'auth_account',
		fields: {
			accountId: 'account_id',
			providerId: 'provider_id',
			userId: 'user_id',
			accessToken: 'access_token',
			refreshToken: 'refresh_token',
			idToken: 'id_token',
			accessTokenExpiresAt: 'access_token_expires_at',
			refreshTokenExpiresAt: 'refresh_token_expires_at',
			createdAt: 'created_at',
			updatedAt: 'updated_at'
		}
	},
	verification: {
		modelName: 'auth_verification',
		fields: {
			expiresAt: 'expires_at',
			createdAt: 'created_at',
			updatedAt: 'updated_at'
		}
	},
	advanced: {
		database: {
			generateId: () => crypto.randomUUID(),
			validateSchema: false
		}
	},
	socialProviders: {
		...(authEnabled.google
			? {
					google: {
						clientId: googleId,
						clientSecret: googleSecret,
						prompt: 'select_account' as const,
						...(env.GOOGLE_HOSTED_DOMAIN ? { hd: env.GOOGLE_HOSTED_DOMAIN } : {})
					}
				}
			: {}),
		...(authEnabled.microsoft
			? {
					microsoft: {
						clientId: microsoftId,
						clientSecret: microsoftSecret,
						tenantId: env.MICROSOFT_TENANT_ID || 'common',
						prompt: 'select_account',
						mapProfileToUser: (profile: {
							email?: string;
							preferred_username?: string;
							name?: string;
						}) => ({
							email: profile.email || profile.preferred_username || '',
							name: profile.name || profile.preferred_username || 'Student'
						})
					}
				}
			: {})
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					if (user.email && !allowedEmail(user.email)) {
						throw new APIError('BAD_REQUEST', {
							message: 'Përdor emailin e universitetit.'
						});
					}
					return { data: user };
				}
			}
		}
	},
	plugins: [
		magicLink({
			sendMagicLink,
			expiresIn: 300
		}),
		...(building ? [] : [sveltekitCookies(getRequestEvent)])
	]
});
