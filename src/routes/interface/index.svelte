<script context="module">
</script>

<script>

    import Preview from '$lib/Preview.svelte';
    import Controls from './_Controls.svelte';

</script>

<div class="wrapper">
    <main>
        <Controls />
    </main>

    <aside>
        <Preview />
    </aside>
</div>

<style lang="scss">

.wrapper {
    display: flex;
    height: 100vh;
    align-items: stretch;
    main, aside {
        flex: 1;
        width: 50%;
        height: 100vh;
    }
    main {
        border-right: 1px solid black;
    }
}

</style>