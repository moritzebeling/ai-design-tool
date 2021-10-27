<script context="module">

    export const prerender = true;
    export const ssr = true;

    export async function load({ page, fetch, session, context }) {
		const res = await fetch('options.json');
		if (res.ok) {
			return {
				props: {
					options: await res.json()
				}
			};
		}
	}

</script>

<script>

    import Group from '$lib/Group.svelte';

    export let options = [];

</script>
     
<main>
    <Group {options} />
</main>

<style lang="scss">

    header, main {
        margin: 1rem;
    }

</style>