<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import GoogleLogo from '$lib/components/GoogleLogo.svelte';
	import MicrosoftLogo from '$lib/components/MicrosoftLogo.svelte';

	let {
		google = false,
		microsoft = false,
		error = ''
	}: {
		google?: boolean;
		microsoft?: boolean;
		error?: string;
	} = $props();

	let email = $state('');
	let sending = $state(false);
	let sentTo = $state('');
	let localError = $state('');
	let busy = $state('');

	const message = $derived(localError || error);
	const inbox = $derived(inboxUrl(sentTo));

	function inboxUrl(address: string) {
		const domain = address.split('@')[1]?.toLowerCase() ?? '';
		if (domain === 'gmail.com' || domain === 'googlemail.com') {
			return 'https://mail.google.com/mail/u/0/#inbox';
		}
		if (
			domain === 'outlook.com' ||
			domain === 'hotmail.com' ||
			domain === 'live.com' ||
			domain === 'msn.com'
		) {
			return 'https://outlook.live.com/mail/';
		}
		return 'https://outlook.office.com/mail/';
	}

	async function social(provider: 'google' | 'microsoft') {
		localError = '';
		busy = provider;
		const { error: fail } = await authClient.signIn.social({
			provider,
			callbackURL: '/',
			errorCallbackURL: '/?auth_error=1'
		});
		busy = '';
		if (fail) localError = fail.message || 'Hyrja dështoi.';
	}

	async function sendLink() {
		const address = (sentTo || email).trim();
		if (!address) {
			localError = 'Shkruaj emailin.';
			return;
		}

		localError = '';
		sending = true;
		const { error: fail } = await authClient.signIn.magicLink({
			email: address,
			name: address.split('@')[0] || 'Student',
			callbackURL: '/',
			newUserCallbackURL: '/',
			errorCallbackURL: '/?auth_error=1'
		});
		sending = false;
		if (fail) {
			localError = fail.message || 'Nuk u dërgua linku.';
			return;
		}
		sentTo = address;
	}

	function useOtherEmail() {
		sentTo = '';
		localError = '';
	}
</script>

<div class="flex flex-1 flex-col justify-center py-10">
	{#if sentTo}
		<p class="text-3xl tracking-tight md:text-4xl">Shiko emailin</p>
		<p class="mt-3 max-w-md text-[15px] leading-6 text-mute">
			Të dërguam një link te <span class="text-ink">{sentTo}</span>. Hapje dhe hyr. Zakonisht vjen
			brenda një minute. Nëse nuk e sheh, kontrollo spam.
		</p>

		<div class="mt-8 flex max-w-md flex-col gap-3">
			<a
				href={inbox}
				target="_blank"
				rel="noreferrer"
				class="rounded-full bg-ink px-5 py-3 text-center text-[15px] text-page"
			>
				Hap emailin
			</a>
			<button
				type="button"
				class="rounded-full border border-line bg-chip px-5 py-3 text-[15px] disabled:opacity-70"
				onclick={sendLink}
				disabled={sending}
			>
				{sending ? 'Duke dërguar...' : 'Dërgo përsëri'}
			</button>
			<button
				type="button"
				class="px-5 py-2 text-sm text-mute hover:text-ink"
				onclick={useOtherEmail}
			>
				Përdor email tjetër
			</button>
			{#if message}
				<p class="text-sm text-red-400">{message}</p>
			{/if}
		</div>
	{:else}
		<p class="text-3xl tracking-tight md:text-4xl">Hyr në UniAgent</p>
		<p class="mt-3 max-w-md text-[15px] leading-6 text-mute">
			Hyr me Google, Microsoft ose me email.
		</p>

		<div class="mt-8 flex max-w-md flex-col gap-3">
			{#if microsoft}
				<button
					type="button"
					class="flex items-center justify-center gap-2 rounded-full border border-line bg-chip px-5 py-3 text-[15px] disabled:opacity-70"
					onclick={() => social('microsoft')}
					disabled={!!busy || sending}
				>
					<MicrosoftLogo />
					Hyr me Microsoft
				</button>
			{/if}

			{#if google}
				<button
					type="button"
					class="flex items-center justify-center gap-2 rounded-full border border-line bg-chip px-5 py-3 text-[15px] disabled:opacity-70"
					onclick={() => social('google')}
					disabled={!!busy || sending}
				>
					<GoogleLogo />
					Hyr me Google
				</button>
			{/if}

			{#if google || microsoft}
				<p class="py-1 text-center text-sm text-mute">ose</p>
			{/if}

			<form
				class="flex flex-col gap-3"
				onsubmit={(event) => {
					event.preventDefault();
					sendLink();
				}}
			>
				<input
					type="email"
					required
					autocomplete="email"
					placeholder="Email"
					bind:value={email}
					disabled={sending || !!busy}
					class="rounded-full border border-line bg-chip px-5 py-3 text-[15px] outline-none placeholder:text-mute disabled:opacity-70"
				/>
				<button
					type="submit"
					class="rounded-full bg-ink px-5 py-3 text-[15px] text-page disabled:opacity-70"
					disabled={sending || !!busy}
				>
					{sending ? 'Duke dërguar...' : 'Dërgo linkun'}
				</button>
			</form>

			{#if message}
				<p class="text-sm text-red-400">{message}</p>
			{/if}
		</div>
	{/if}
</div>
