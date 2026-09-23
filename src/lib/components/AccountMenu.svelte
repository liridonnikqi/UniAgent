<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let {
		label,
		onProfile,
		onLogout
	}: {
		label: string;
		onProfile: () => void;
		onLogout: () => void;
	} = $props();

	let open = $state(false);
	let root = $state.raw<HTMLElement | undefined>();

	function close() {
		open = false;
	}

	$effect(() => {
		if (!open) return;
		function onPointer(event: PointerEvent) {
			if (root && !root.contains(event.target as Node)) close();
		}
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') close();
		}
		document.addEventListener('pointerdown', onPointer);
		window.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onPointer);
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="relative min-w-0" bind:this={root}>
	<button
		type="button"
		class="flex max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm text-mute hover:bg-chip hover:text-ink"
		onclick={() => (open = !open)}
		aria-haspopup="menu"
		aria-expanded={open}
	>
		<span class="truncate">{label}</span>
		<ChevronDown class="size-4 shrink-0 {open ? 'rotate-180' : ''}" strokeWidth={1.8} />
	</button>

	{#if open}
		<div
			class="absolute right-0 z-30 mt-1 min-w-44 rounded-lg border border-line bg-chip p-1"
			role="menu"
		>
			<button
				type="button"
				class="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-ink/10"
				role="menuitem"
				onclick={() => {
					close();
					onProfile();
				}}
			>
				Profili
			</button>
			<button
				type="button"
				class="block w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-ink/10"
				role="menuitem"
				onclick={() => {
					close();
					onLogout();
				}}
			>
				Dil
			</button>
		</div>
	{/if}
</div>
