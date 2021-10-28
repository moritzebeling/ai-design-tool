<script>
	import '../scss/global.scss';
    import Popup from '$lib/Popup.svelte';
    import Spinner from '$lib/Spinner.svelte';

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
        <h1>SEMI*</h1>
    </div>
    <div>
        <button on:click={()=> showGuide = true }>User Guide</button>
        <button on:click={()=> showPreview = true }>Preview</button>
    </div>
</header>

{#if showGuide}
    <Popup title="User Guide" on:close="{()=> showGuide = false }" size="small">
        <div class="text">
            <p>In the early 2030s, there were already a lot of AI tools that promised to make graphic designers' jobs easier and less tedious. The graphic design of these tools was functional, but lifeless, generic and repetitive. Frustrated by the endless empty promises of various big companies and also countless small startups and an emerging formal language that repeated the common canon, a research group of thinkers, coders, artists, designers and poets got together to build a new AI tool, based on language theory, that could create visuality not only from sight-based input and with expressions from different people all over the world speaking different languages, with various cultural backgrounds and non common design terminology.</p>
            <p>The tool should illustrate that graphic design is more complex than simple sliders between less color and more color, between organized and chaotic.</p>
            <p>Here you can see the first beta version of SEMI. It was a niche product, used within small groups of designers for a while and soon forgotten. </p>
        </div>
    </Popup>
{/if}

{#if showPreview}
    <Popup title="Live Preview" on:close="{()=> showPreview = false }" top={200} left={200}>
        <div class="center">
            <Spinner />
        </div>
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
		font-size: 2rem;
	}
    .center {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 12rem;
    }
</style>