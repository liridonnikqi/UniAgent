<script lang="ts">
	import { afterNavigate, invalidateAll } from '$app/navigation';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Menu from '@lucide/svelte/icons/menu';
	import { untrack } from 'svelte';
	import AccountMenu from '$lib/components/AccountMenu.svelte';
	import AssistantMessage from '$lib/components/AssistantMessage.svelte';
	import Login from '$lib/components/Login.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import LogoutModal from '$lib/components/LogoutModal.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import ProfileModal from '$lib/components/ProfileModal.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Thinking from '$lib/components/Thinking.svelte';
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

	function copyMessages(list: ChatMessage[]): ChatMessage[] {
		return list.map((msg) => ({ ...msg }));
	}

	function sameTranscript(a: ChatMessage[], b: ChatMessage[]): boolean {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (a[i].role !== b[i].role || a[i].content !== b[i].content) return false;
		}
		return true;
	}

	// svelte-ignore state_referenced_locally
	let messages = $state<ChatMessage[]>(copyMessages(data.messages));
	let sidebarOpen = $state(false);
	let logoutOpen = $state(false);
	let profileOpen = $state(false);
	let input = $state('');
	let loading = $state(false);
	let thinking = $state(false);
	let error = $state('');
	let scroller = $state.raw<HTMLElement | undefined>();
	let composer = $state.raw<HTMLTextAreaElement | undefined>();
	let pinToBottom = $state(true);
	// svelte-ignore state_referenced_locally
	let hasMore = $state(data.hasMore);
	let loadingOlder = $state(false);
	let liveReply = $state('');
	let incoming = '';
	let typeTimer = 0;
	let stickRaf = 0;
	let resumedFor = $state('');
	// svelte-ignore state_referenced_locally
	let seenSession = $state(data.sessionId);
	const sessionId = $derived(data.sessionId);
	const ready = $derived(Boolean(data.user?.name && data.user?.university));
	const pending = $derived(data.messages.at(-1)?.role === 'user');

	afterNavigate(() => {
		pinToBottom = true;
		const pin = () => {
			if (!scroller) return;
			scroller.scrollTop = scroller.scrollHeight;
		};
		pin();
		requestAnimationFrame(pin);
		setTimeout(pin, 80);
	});

	function onScroll() {
		if (!scroller) return;
		const gap = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
		const pinned = gap < 32;
		if (pinned !== pinToBottom) pinToBottom = pinned;
	}

	function resizeComposer() {
		if (!composer) return;
		composer.style.height = 'auto';
		composer.style.height = `${composer.scrollHeight}px`;
		stickBottom();
	}

	function stickBottom() {
		if (!scroller || !pinToBottom) return;
		if (stickRaf) return;
		stickRaf = requestAnimationFrame(() => {
			stickRaf = 0;
			if (!scroller || !pinToBottom) return;
			scroller.scrollTop = scroller.scrollHeight;
		});
	}

	async function loadOlder() {
		if (loadingOlder || !hasMore || !messages[0]?.created_at) return;
		pinToBottom = false;
		loadingOlder = true;
		const prevHeight = scroller?.scrollHeight ?? 0;

		try {
			const before = encodeURIComponent(messages[0].created_at);
			const res = await fetch(`/api/messages?s=${sessionId}&before=${before}`);
			const payload = await res.json();
			if (!res.ok || !Array.isArray(payload.messages)) return;

			messages = [...payload.messages, ...messages];
			hasMore = Boolean(payload.hasMore);

			requestAnimationFrame(() => {
				if (!scroller) return;
				scroller.scrollTop = scroller.scrollHeight - prevHeight;
			});
		} catch {
			error = 'Nuk u ngarkuan mesazhet e vjetra.';
		} finally {
			loadingOlder = false;
		}
	}

	$effect.pre(() => {
		const serverSession = data.sessionId;
		const serverMessages = data.messages;
		const serverHasMore = data.hasMore;

		untrack(() => {
			if (serverSession !== seenSession) {
				seenSession = serverSession;
				loading = false;
				thinking = false;
				error = '';
				pinToBottom = true;
				hasMore = serverHasMore;
				stopTypewriter();
				liveReply = '';
				incoming = '';
				messages = copyMessages(serverMessages);
				queueMicrotask(stickBottom);
				return;
			}

			if (loading || thinking || liveReply) return;
			if (messages.length > serverMessages.length) return;

			if (!sameTranscript(messages, serverMessages)) {
				messages = copyMessages(serverMessages);
			}

			if (hasMore !== serverHasMore) hasMore = serverHasMore;
		});
	});

	$effect(() => {
		const el = scroller;
		if (!el) return;
		const pin = () => {
			if (scroller !== el || !pinToBottom) return;
			el.scrollTop = el.scrollHeight;
		};
		untrack(pin);
		const raf = requestAnimationFrame(pin);
		const later = setTimeout(pin, 80);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(later);
		};
	});

	$effect(() => {
		if (!ready || loading || thinking || liveReply || !pending) return;
		const last = data.messages.at(-1);
		if (!last || last.role !== 'user') return;
		const key = `${data.sessionId}:${last.content}`;

		untrack(() => {
			if (resumedFor === key) return;
			if (messages.at(-1)?.role === 'assistant') return;
			resumedFor = key;
			void send(last.content, true);
		});
	});

	function stopTypewriter() {
		if (typeTimer) {
			cancelAnimationFrame(typeTimer);
			typeTimer = 0;
		}
	}

	function writeLiveReply(text: string) {
		liveReply = text;
		const last = messages.at(-1);
		if (last?.role === 'assistant') {
			last.content = text;
			return;
		}
		messages = [...messages, { role: 'assistant', content: text, id: crypto.randomUUID() }];
	}

	function flushStream() {
		typeTimer = 0;
		if (!incoming) return;
		thinking = false;
		writeLiveReply(liveReply + incoming);
		incoming = '';
		stickBottom();
	}

	function pushStream(piece: string) {
		if (!piece) return;
		incoming += piece;
		if (!typeTimer) typeTimer = requestAnimationFrame(flushStream);
	}

	function commitLiveReply() {
		stopTypewriter();
		if (incoming) {
			writeLiveReply(liveReply + incoming);
			incoming = '';
		}
		liveReply = '';
	}

	async function send(text = input, resume = false) {
		const question = text.trim();
		if (!question || loading || !ready) return;

		if (!resume) {
			messages = [...messages, { role: 'user', content: question, id: crypto.randomUUID() }];
		}
		input = '';
		queueMicrotask(resizeComposer);
		loading = true;
		thinking = true;
		error = '';
		pinToBottom = true;
		queueMicrotask(stickBottom);

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
				if (piece) pushStream(piece);
			}

			commitLiveReply();

			const last = messages[messages.length - 1];
			if (!last || last.role !== 'assistant' || !last.content) {
				throw new Error('Nuk mora përgjigje. Kontrollo çelësin e API-së dhe provo përsëri.');
			}

			await invalidateAll();
		} catch (err) {
			thinking = false;
			commitLiveReply();
			const last = messages.at(-1);
			if (last?.role === 'assistant' && last.content) {
				error = 'Përgjigja u ndërpre. Mund ta kopjosh atë që erdhi, ose provo përsëri.';
			} else {
				error = err instanceof Error ? err.message : 'Diçka shkoi keq';
				if (last?.role === 'assistant') {
					messages = messages.slice(0, -1);
				}
				if (messages.at(-1)?.role === 'user') {
					input = question;
					messages = messages.slice(0, -1);
				}
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

	function onComposerWheel(event: WheelEvent) {
		if (!composer || composer.scrollHeight <= composer.clientHeight + 1) return;
		event.stopPropagation();
	}

	$effect(() => {
		const el = composer;
		void input;
		if (!el) return;
		untrack(() => {
			resizeComposer();
			stickBottom();
		});
	});
</script>

<div class="flex h-dvh min-h-0 flex-col overflow-hidden bg-page text-ink">
	{#if ready}
		<Sidebar bind:open={sidebarOpen} sessions={data.sessions} {sessionId} />
	{/if}

	<LogoutModal bind:open={logoutOpen} />
	{#if data.user}
		<ProfileModal
			bind:open={profileOpen}
			name={data.user.name ?? ''}
			university={data.user.university ?? ''}
			error={form?.error ?? ''}
		/>
	{/if}

	<header class="flex w-full shrink-0 items-center gap-3 px-3 py-3">
		{#if ready}
			<button
				type="button"
				class="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-chip"
				onclick={() => (sidebarOpen = true)}
				aria-label="Hap bisedat"
			>
				<Menu class="size-6" strokeWidth={1.8} />
			</button>
		{/if}

		<Logo />

		<div class="ml-auto min-w-0">
			{#if data.user}
				<AccountMenu
					label={data.user.name && data.user.university
						? `${data.user.name} · ${data.user.university}`
						: (data.user.email ?? '')}
					onProfile={() => (profileOpen = true)}
					onLogout={() => (logoutOpen = true)}
				/>
			{/if}
		</div>
	</header>

	<main
		class="chat-scroll min-h-0 flex-1 overflow-y-auto px-5"
		bind:this={scroller}
		onscroll={onScroll}
	>
		<div class="mx-auto flex min-h-full max-w-2xl flex-col">
			{#if data.dbError}
				<p class="py-10 text-sm text-red-400">{data.dbError}</p>
			{:else if !data.user}
				<Login google={data.auth.google} microsoft={data.auth.microsoft} error={data.authError} />
			{:else if !ready}
				<Onboarding
					error={form?.error ?? ''}
					name={data.user.name ?? ''}
					university={data.user.university ?? ''}
				/>
			{:else}
				<div class="flex min-h-full flex-1 flex-col">
					{#if messages.length === 0 && !thinking && !pending && !liveReply}
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
						<div class="space-y-6 pt-4 pb-8">
							{#if hasMore}
								<div class="flex justify-center">
									<button
										type="button"
										class="rounded-full border border-line px-4 py-1.5 text-sm text-mute hover:bg-chip"
										onclick={loadOlder}
										disabled={loadingOlder}
									>
										{loadingOlder ? 'Duke ngarkuar...' : 'Mesazhe më të vjetra'}
									</button>
								</div>
							{/if}
							{#each messages as msg, i (msg.id ?? `${i}:${msg.role}`)}
								{#if msg.role === 'user'}
									<div class="flex justify-end">
										<div
											class="max-w-[80%] rounded-3xl bg-user px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-page"
										>
											{msg.content}
										</div>
									</div>
								{:else}
									<AssistantMessage
										content={msg.content}
										live={Boolean(liveReply && i === messages.length - 1)}
									/>
								{/if}
							{/each}

							{#if thinking && messages.at(-1)?.role !== 'assistant'}
								<Thinking />
							{/if}
						</div>
					{/if}
				</div>
			{/if}

			{#if error}
				<p class="mt-4 text-sm text-red-400">{error}</p>
			{/if}
		</div>
	</main>

	{#if ready}
		<form
			class="shrink-0 px-5 pt-3 pb-6"
			onsubmit={(event) => {
				event.preventDefault();
				send();
			}}
		>
			<div
				class="mx-auto flex max-w-2xl items-end gap-2 overflow-hidden rounded-[28px] border border-line bg-chip py-2 pr-2 pl-5"
			>
				<textarea
					class="composer max-h-36 min-h-10 flex-1 resize-none overflow-y-auto bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-mute"
					placeholder="Shkruaj pyetjen tënde..."
					rows="1"
					autocomplete="off"
					bind:this={composer}
					bind:value={input}
					onkeydown={onKeydown}
					oninput={resizeComposer}
					onwheel={onComposerWheel}
					disabled={loading}></textarea>
				<button
					type="submit"
					class="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-page disabled:opacity-30"
					disabled={loading || !input.trim()}
					aria-label="Dërgo"
				>
					<ArrowRight class="size-4" strokeWidth={1.8} />
				</button>
			</div>
		</form>
	{/if}
</div>
