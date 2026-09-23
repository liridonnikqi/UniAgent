<script lang="ts">
	import CodeBlock from '$lib/components/CodeBlock.svelte';
	import { renderMarkdown } from '$lib/markdown';
	import { parseMessage } from '$lib/parseMessage';

	let { content = '', live = false }: { content: string; live?: boolean } = $props();

	const parts = $derived(parseMessage(content));
</script>

<div class="stream-line text-[15px] leading-7 break-words">
	{#each parts as part, i (i)}
		{#if part.type === 'code'}
			<CodeBlock lang={part.lang} code={part.code} live={live && i === parts.length - 1} />
		{:else}
			<div class="md">
				{@html renderMarkdown(part.text)}
				{#if live && i === parts.length - 1}<span class="stream-caret"></span>{/if}
			</div>
		{/if}
	{/each}
	{#if live && parts.length === 0}
		<span class="stream-caret"></span>
	{/if}
</div>
