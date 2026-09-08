<script lang="ts">
	let elapsed = $state('0.0');

	$effect(() => {
		const started = Date.now();
		const timer = setInterval(() => {
			elapsed = ((Date.now() - started) / 1000).toFixed(1);
		}, 100);

		return () => clearInterval(timer);
	});
</script>

<div class="flex items-center gap-3 text-sm text-mute">
	<span class="flex gap-1">
		<span class="size-1.5 animate-pulse rounded-full bg-ink/80"></span>
		<span class="size-1.5 animate-pulse rounded-full bg-ink/50 [animation-delay:150ms]"></span>
		<span class="size-1.5 animate-pulse rounded-full bg-ink/30 [animation-delay:300ms]"></span>
	</span>
	<span>Duke punuar</span>
	<span class="tabular-nums">{elapsed}s</span>
</div>
