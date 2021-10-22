<script context="module">

    export const prerender = true;
    export const ssr = true;

</script>

<script>

    import Preview from '$lib/Preview.svelte';
    import Controls from './_Controls.svelte';

    let isGenerating = false;

    function onupdate(){
        console.log('update');
        isGenerating = true;
    }

</script>

<div class="wrapper">
    
    <main>

        <div class="controls">
            <h1>Definitive AI design tool</h1>
            <Controls on:update={onupdate} />
        </div>

        <div class="submit">
            <button>Create</button>
        </div>

    </main>

    <aside>
        <Preview {isGenerating} />
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
            display: flex;
            flex-direction: column;
            padding: 1rem;
        }
    }

    .controls {
        flex: 1;
        height: 100vh;
        overflow-y: auto;
    }

    .submit {
        display: flex;
        justify-content: flex-end;
    }


</style>