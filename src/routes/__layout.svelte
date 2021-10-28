<script>

	import '../scss/global.scss';
    import Popup from '$lib/Popup.svelte';
    import Preview from './_popups/Preview.svelte';
    import Guide from './_popups/Guide.svelte';

    let showGuide = false;
    let showPreview = false;

</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com"> 
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> 
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&display=swap" rel="stylesheet">
</svelte:head>

<header>
    <div>
        <h1>
            <img src="/semi-logo.svg" width="241" height="84" />
        </h1>
    </div>
    <div>
        <button on:click={()=> showGuide = true }>User Guide</button>
        <button on:click={()=> showPreview = true }>Preview</button>
    </div>
</header>

{#if showGuide}
    <Popup title="User Guide" on:close="{()=> showGuide = false }" size="small">
        <Guide />
    </Popup>
{/if}

{#if showPreview}
    <Popup title="Live Preview" on:close="{()=> showPreview = false }" top={200} left={200}>
        <Preview />
    </Popup>
{/if}

<slot />

<style lang="scss">
    header {
        margin: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
    }
	h1 {
		img {
            height: 2.5rem;
            width: auto;
        }
	}
</style>