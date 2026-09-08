<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { ChatSession } from '$lib/types';

	let {
		sessions,
		sessionId,
		open = $bindable()
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
				class="cursor-pointer rounded-full px-3 py-1.5 text-sm text-mute hover:bg-chip"
				onclick={() => (open = false)}
			>
				Mbyll
			</button>
		</div>

		<form
			method="POST"
			action="?/newChat"
			use:enhance={() => {
				return async ({ result }) => {
					open = false;
					if (result.type === 'redirect') {
						await goto(result.location);
					}
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
				<a
					href="/?s={session.id}"
					class="block cursor-pointer rounded-full px-4 py-2 text-sm {session.id === sessionId
						? 'bg-chip text-ink'
						: 'text-mute hover:bg-chip'}"
					onclick={() => (open = false)}
				>
					{session.title}
				</a>
			{/each}
		</nav>
	</aside>
</div>
