<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import type { SubmitFunction } from '@sveltejs/kit';

	let {
		open = $bindable(false),
		name = '',
		university = '',
		error = ''
	}: {
		open: boolean;
		name?: string;
		university?: string;
		error?: string;
	} = $props();

	let nameValue = $state('');
	let universityValue = $state('');
	let submitting = $state(false);

	$effect(() => {
		if (!open) return;
		nameValue = name;
		universityValue = university;
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') open = false;
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const onSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ result, update }) => {
			submitting = false;
			await update({ reset: false });
			if (result.type === 'success') open = false;
		};
	};
</script>

{#if open}
	<div class="fixed inset-0 z-40 flex items-center justify-center px-5">
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-md"
			aria-label="Mbyll"
			onclick={() => (open = false)}
		></button>

		<div
			class="relative w-full max-w-sm rounded-3xl border border-line bg-chip p-6"
			transition:fly={{ y: 10, duration: 220 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="profile-title"
		>
			<p id="profile-title" class="text-lg tracking-tight">Profili</p>
			<p class="mt-2 text-[15px] leading-6 text-mute">Ndrysho emrin ose universitetin.</p>

			<form
				method="POST"
				action="?/updateProfile"
				class="mt-5 flex flex-col gap-3"
				use:enhance={onSubmit}
			>
				<input
					name="name"
					required
					autocomplete="name"
					placeholder="Emri yt"
					bind:value={nameValue}
					disabled={submitting}
					class="rounded-full border border-line bg-page px-5 py-3 text-[15px] outline-none placeholder:text-mute disabled:opacity-70"
				/>
				<input
					name="university"
					required
					placeholder="Universiteti"
					bind:value={universityValue}
					disabled={submitting}
					class="rounded-full border border-line bg-page px-5 py-3 text-[15px] outline-none placeholder:text-mute disabled:opacity-70"
				/>
				{#if error}
					<p class="text-sm text-red-400">{error}</p>
				{/if}
				<div class="mt-2 flex justify-end gap-2">
					<button
						type="button"
						class="rounded-full border border-line px-4 py-2 text-sm text-mute"
						onclick={() => (open = false)}
					>
						Anulo
					</button>
					<button
						type="submit"
						class="rounded-full bg-ink px-4 py-2 text-sm text-page disabled:opacity-70"
						disabled={submitting}
					>
						Ruaj
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
