<script context="module">

    export const prerender = true;
    export const ssr = true;

</script>

<script>

    import Spinner from '$lib/Spinner.svelte';

</script>
     
<div class="wrapper">
    <header>
        <h1>SEMI*</h1>
    </header>
    <main>
        <Spinner />
    </main>
    <footer>
        <h3>Live preivew is generating</h3>
    </footer>
</div>

<style lang="scss">

    .wrapper {
        height: 100vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 2rem;
    }
    header, main, footer {
        padding: 1rem;
        text-align: center;
    }
    h1 {
        font-size: 8rem;
    }
    footer {
        font-size: 2rem;
    }
    main {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 4rem;
    }

</style>