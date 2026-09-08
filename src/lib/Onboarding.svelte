<script lang="ts">
	import { enhance } from '$app/forms';

	let { error = '' }: { error?: string } = $props();
</script>

<div class="flex flex-1 flex-col justify-center py-10">
	<p class="text-3xl tracking-tight md:text-4xl">Përshëndetje</p>
	<p class="mt-3 max-w-md text-[15px] leading-6 text-mute">
		Më thuaj emrin dhe universitetin që t’i përshtas përgjigjet te ti.
	</p>

	<form method="POST" action="?/profile" use:enhance class="mt-8 flex max-w-md flex-col gap-3">
		<input
			name="name"
			required
			autocomplete="name"
			placeholder="Emri yt"
			class="rounded-full border border-line bg-chip px-5 py-3 text-[15px] outline-none placeholder:text-mute"
		/>
		<input
			name="university"
			required
			placeholder="Universiteti"
			class="rounded-full border border-line bg-chip px-5 py-3 text-[15px] outline-none placeholder:text-mute"
		/>
		<button type="submit" class="rounded-full bg-ink px-5 py-3 text-[15px] text-page">
			Vazhdo
		</button>
		{#if error}
			<p class="text-sm text-red-400">{error}</p>
		{/if}
	</form>
</div>
