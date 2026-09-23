<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';
	import { highlightCode } from '$lib/highlight';

	let {
		lang = '',
		code = '',
		live = false
	}: {
		lang?: string;
		code: string;
		live?: boolean;
	} = $props();

	let copied = $state(false);
	let timer = 0;
	const html = $derived(highlightCode(code, lang));

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			clearTimeout(timer);
			timer = window.setTimeout(() => (copied = false), 1400);
		} catch {
			copied = false;
		}
	}
</script>

<div class="code-block my-3 overflow-hidden rounded-xl border border-line bg-page">
	<div class="flex items-center gap-2 border-b border-line px-3 py-1.5">
		<p class="min-w-0 flex-1 truncate text-xs tracking-wide text-mute uppercase">
			{lang || 'kod'}
		</p>
		<button
			type="button"
			class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-mute hover:bg-chip hover:text-ink"
			onclick={copy}
		>
			{#if copied}
				<Check class="size-3.5" strokeWidth={2} />
				Kopjuar
			{:else}
				<Copy class="size-3.5" strokeWidth={1.8} />
				Kopjo
			{/if}
		</button>
	</div>
	<pre
		class="code-scroll hljs max-h-80 overflow-auto px-3 py-3 font-mono text-[13px] leading-6"><code
			>{@html html}</code
		>{#if live}<span class="stream-caret"></span>{/if}</pre>
</div>
