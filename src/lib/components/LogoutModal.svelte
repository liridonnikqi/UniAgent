<script lang="ts">
	import { fly } from 'svelte/transition';

	let { open = $bindable(false) }: { open: boolean } = $props();

	function close() {
		open = false;
	}

	$effect(() => {
		if (!open) return;
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') close();
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

{#if open}
	<div class="fixed inset-0 z-40 flex items-center justify-center px-5">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-md"
			aria-label="Anulo"
			onclick={close}
		></button>

		<div
			class="relative w-full max-w-sm rounded-3xl border border-line bg-chip p-6"
			transition:fly={{ y: 10, duration: 220 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="logout-title"
		>
			<p id="logout-title" class="text-lg tracking-tight">Dil nga UniAgent?</p>
			<p class="mt-2 text-[15px] leading-6 text-mute">
				Bisedat tuaja janë të lidhura me këtë shfletues. Nëse dilni, nuk do t’i hapni më këto
				sesione.
			</p>

			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-full bg-white px-4 py-2 text-sm text-page"
					onclick={close}
				>
					Anulo
				</button>
				<form method="POST" action="?/logout">
					<button type="submit" class="rounded-full bg-danger px-4 py-2 text-sm text-white">
						Dil
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
