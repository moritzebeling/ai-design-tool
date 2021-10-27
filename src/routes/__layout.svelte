<script>
	import '../scss/global.scss';
    import Popup from '$lib/Popup.svelte';
    import Spinner from '$lib/Spinner.svelte';

    let showGuide = true;
    let showPreview = true;

</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com"> 
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> 
	<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet">
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
            <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
            <p>Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.</p>
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