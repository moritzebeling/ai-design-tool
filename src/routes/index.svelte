<script context="module">

    export const prerender = true;
    export const ssr = true;

</script>

<script>

    import Group from '$lib/Group.svelte';

</script>
     
<header>
    <h1>The FINAL DESIGN tool</h1>
</header>

<main>
    <Group />
</main>

<style lang="scss">

    header, main {
        margin: 1rem;
    }

</style>