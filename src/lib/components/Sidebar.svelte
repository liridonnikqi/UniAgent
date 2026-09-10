<script lang="ts">
	import { enhance } from '$app/forms';
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import type { ChatSession } from '$lib/types';

	let {
		sessions,
		sessionId,
		open = $bindable(false)
	}: {
		sessions: ChatSession[];
		sessionId: string;
		open: boolean;
	} = $props();
</script>

<div
	class="fixed inset-0 z-20 {open ? 'pointer-events-auto' : 'pointer-events-none'}"
	aria-hidden={!open}
>
	<button
		type="button"
		class="absolute inset-0 bg-black/50 transition-opacity duration-300 {open
			? 'opacity-100'
			: 'opacity-0'}"
		aria-label="Mbyll bisedat"
		onclick={() => (open = false)}
		tabindex={open ? 0 : -1}
	></button>

	<aside
		class="absolute inset-y-0 left-0 flex w-72 flex-col bg-page px-4 py-4 transition-transform duration-300 ease-out {open
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<div class="flex items-center justify-between gap-3">
			<p class="text-[15px]">Bisedat</p>
			<button
				type="button"
				class="flex size-9 cursor-pointer items-center justify-center rounded-full text-mute hover:bg-chip hover:text-ink"
				onclick={() => (open = false)}
				aria-label="Mbyll bisedat"
			>
				<PanelLeftClose class="size-5" strokeWidth={1.8} />
			</button>
		</div>

		<form
			method="POST"
			action="?/newChat"
			use:enhance={() => {
				return async ({ update }) => {
					open = false;
					await update();
				};
			}}
			class="mt-4"
		>
			<button
				type="submit"
				class="w-full cursor-pointer rounded-full bg-ink px-4 py-2 text-sm text-page"
			>
				Bisedë e re
			</button>
		</form>

		<nav class="mt-4 flex-1 space-y-1 overflow-y-auto">
			{#each sessions as session (session.id)}
				<div
					class="group flex items-center gap-1 rounded-full {session.id === sessionId
						? 'bg-chip'
						: 'hover:bg-chip'}"
					animate:flip={{ duration: 220 }}
					out:fly={{ x: -16, duration: 200 }}
				>
					<a
						href="/?s={session.id}"
						class="min-w-0 flex-1 truncate px-4 py-2 text-sm {session.id === sessionId
							? 'text-ink'
							: 'text-mute'}"
						onclick={() => (open = false)}
					>
						{session.title}
					</a>
					<form
						method="POST"
						action="?/deleteChat"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={session.id} />
						<button
							type="submit"
							class="mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-danger/80 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-danger"
							aria-label="Fshi bisedën"
						>
							<Trash2 class="size-4" strokeWidth={1.8} />
						</button>
					</form>
				</div>
			{/each}
		</nav>
	</aside>
</div>
