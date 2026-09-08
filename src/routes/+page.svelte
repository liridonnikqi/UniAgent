<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Onboarding from '$lib/Onboarding.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import Thinking from '$lib/Thinking.svelte';
	import type { ChatMessage } from '$lib/types';

	let { data, form } = $props();

	const starters = [
		{
			label: 'Provime',
			text: 'Si ta planifikoj javën e fundit para provimeve?'
		},
		{
			label: 'Shpjegim',
			text: 'Më shpjego polimorfizmin me një shembull të thjeshtë.'
		},
		{
			label: 'Detyra',
			text: 'Ndihmomë të ndaj një detyrë projekti në hapa të vegjël.'
		},
		{
			label: 'Punim',
			text: 'Si ta strukturoj një punim seminarik?'
		}
	];

	let messages = $state<ChatMessage[]>([]);
	let sidebarOpen = $state(false);
	let input = $state('');
	let loading = $state(false);
	let thinking = $state(false);
	let error = $state('');
	let bottom = $state<HTMLDivElement | undefined>();
	const sessionId = $derived(data.sessionId);

	$effect(() => {
		if (!loading && !thinking) {
			messages = data.messages;
		}
	});

	$effect(() => {
		messages.at(-1)?.content;
		thinking;
		if (messages.length || thinking) {
			bottom?.scrollIntoView({ behavior: loading ? 'auto' : 'smooth' });
		}
	});

	const ready = $derived(Boolean(data.user?.name && data.user?.university));

	async function send(text = input) {
		const question = text.trim();
		if (!question || loading || !ready) return;

		messages = [...messages, { role: 'user', content: question }];
		input = '';
		loading = true;
		thinking = true;
		error = '';

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: question, sessionId })
			});

			if (!res.ok) {
				const payload = await res.json().catch(() => ({}));
				throw new Error(payload.error || 'Kërkesa dështoi');
			}

			if (!res.body) {
				throw new Error('Nuk mora përgjigje');
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const piece = decoder.decode(value, { stream: true });
				if (!piece) continue;

				if (thinking) {
					thinking = false;
					messages = [...messages, { role: 'assistant', content: piece }];
					continue;
				}

				const last = messages.length - 1;
				messages[last] = {
					...messages[last],
					content: messages[last].content + piece
				};
			}

			const last = messages[messages.length - 1];
			if (!last || last.role !== 'assistant' || !last.content) {
				throw new Error('Nuk mora përgjigje. Kontrollo çelësin e API-së dhe provo përsëri.');
			}

			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Diçka shkoi keq';
			thinking = false;
			const last = messages[messages.length - 1];
			if (last?.role === 'assistant' && !last.content) {
				messages = messages.slice(0, -1);
			}
			if (messages.at(-1)?.role === 'user') {
				input = question;
				messages = messages.slice(0, -1);
			}
		} finally {
			thinking = false;
			loading = false;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			send();
		}
	}
</script>

<div class="flex h-dvh flex-col bg-page text-ink">
	{#if ready}
		<Sidebar bind:open={sidebarOpen} sessions={data.sessions} {sessionId} />
	{/if}

	<header class="flex w-full items-center gap-3 px-3 py-3">
		{#if ready}
			<button
				type="button"
				class="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-chip"
				onclick={() => (sidebarOpen = true)}
				aria-label="Hap bisedat"
			>
				<svg viewBox="0 0 24 24" class="size-6" fill="none" aria-hidden="true">
					<path
						d="M4 7h16M4 12h16M4 17h12"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		{/if}

		<p class="text-[15px] font-medium">UniAgent</p>

		<div class="ml-auto flex min-w-0 items-center gap-3">
			{#if data.user?.name}
				<p class="truncate text-sm text-mute">
					{data.user.name} · {data.user.university}
				</p>
				<form method="POST" action="?/logout">
					<button
						type="submit"
						class="cursor-pointer rounded-full bg-white px-4 py-1.5 text-sm text-page"
					>
						Dil
					</button>
				</form>
			{/if}
		</div>
	</header>

	<main class="flex-1 overflow-y-auto px-5">
		<div class="mx-auto flex min-h-full max-w-2xl flex-col">
			{#if data.dbError}
				<p class="py-10 text-sm text-red-400">{data.dbError}</p>
			{:else if !ready}
				<Onboarding error={form?.error} />
			{:else if messages.length === 0 && !thinking}
				<div class="flex flex-1 flex-col justify-center py-10">
					<p class="text-3xl tracking-tight md:text-4xl">
						Përshëndetje{data.user?.name ? `, ${data.user.name}` : ''}
					</p>
					<p class="mt-3 max-w-md text-[15px] leading-6 text-mute">
						Pyet për lëndët, provimet, detyrat ose një punim. Unë të ndihmoj hap pas hapi.
					</p>

					<div class="mt-8 flex flex-wrap gap-2">
						{#each starters as item (item.label)}
							<button
								type="button"
								class="rounded-full border border-line bg-chip px-4 py-2 text-sm text-ink hover:border-ink/30"
								onclick={() => send(item.text)}
							>
								{item.label}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<div class="space-y-6 py-4">
					{#each messages as msg, i (i)}
						{#if msg.role === 'user'}
							<div class="flex justify-end">
								<div
									class="max-w-[80%] rounded-3xl bg-user px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-page"
								>
									{msg.content}
								</div>
							</div>
						{:else}
							<div class="text-[15px] leading-7 whitespace-pre-wrap">
								{msg.content}{#if loading && !thinking && i === messages.length - 1}
									<span
										class="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 rounded-full bg-ink align-middle"
									></span>
								{/if}
							</div>
						{/if}
					{/each}

					{#if thinking}
						<Thinking />
					{/if}
				</div>
			{/if}

			{#if error}
				<p class="mt-4 text-sm text-red-400">{error}</p>
			{/if}

			<div bind:this={bottom}></div>
		</div>
	</main>

	{#if ready}
		<form
			class="px-5 pb-6"
			onsubmit={(event) => {
				event.preventDefault();
				send();
			}}
		>
			<div
				class="mx-auto flex max-w-2xl items-end gap-2 rounded-full border border-line bg-chip py-2 pr-2 pl-5"
			>
				<textarea
					class="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-mute"
					placeholder="Shkruaj pyetjen tënde..."
					rows="1"
					autocomplete="off"
					bind:value={input}
					onkeydown={onKeydown}
					disabled={loading}></textarea>
				<button
					type="submit"
					class="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-page disabled:opacity-30"
					disabled={loading || !input.trim()}
					aria-label="Dërgo"
				>
					<svg viewBox="0 0 24 24" class="size-4" fill="none" aria-hidden="true">
						<path
							d="M5 12h14M13 6l6 6-6 6"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>
		</form>
	{/if}
</div>
