<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		error = '',
		name: initialName = '',
		university: initialUniversity = ''
	}: {
		error?: string;
		name?: string;
		university?: string;
	} = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(initialName);
	// svelte-ignore state_referenced_locally
	let university = $state(initialUniversity);
	let submitting = $state(false);

	const onSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ result, update }) => {
			if (result.type !== 'redirect') submitting = false;
			await update({ reset: false });
		};
	};
</script>

<div class="flex flex-1 flex-col justify-center py-10">
	<p class="text-3xl tracking-tight md:text-4xl">Përshëndetje</p>
	<p class="mt-3 max-w-md text-[15px] leading-6 text-mute">
		Shkruaj emrin dhe universitetin, që t’i bëj përgjigjet më personale.
	</p>

	<form
		method="POST"
		action="?/profile"
		class="mt-8 flex max-w-md flex-col gap-3"
		use:enhance={onSubmit}
	>
		<input
			name="name"
			required
			autocomplete="name"
			placeholder="Emri yt"
			bind:value={name}
			disabled={submitting}
			class="rounded-full border border-line bg-chip px-5 py-3 text-[15px] outline-none placeholder:text-mute disabled:opacity-70"
		/>
		<input
			name="university"
			required
			placeholder="Universiteti"
			bind:value={university}
			disabled={submitting}
			class="rounded-full border border-line bg-chip px-5 py-3 text-[15px] outline-none placeholder:text-mute disabled:opacity-70"
		/>
		<button
			type="submit"
			class="rounded-full bg-ink px-5 py-3 text-[15px] text-page disabled:opacity-70"
			disabled={submitting}
		>
			Vazhdo
		</button>
		{#if error}
			<p class="text-sm text-red-400">{error}</p>
		{/if}
	</form>
</div>
