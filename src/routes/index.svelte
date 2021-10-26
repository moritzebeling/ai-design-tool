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
     
<header>
    <h1>SEMI*</h1>
</header>

<main>
    <Group {options} />
</main>

<style lang="scss">

    header, main {
        margin: 1rem;
    }

</style>