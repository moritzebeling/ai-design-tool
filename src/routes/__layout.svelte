<script>
	import '../scss/global.scss';
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com"> 
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> 
	<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet">
</svelte:head>

<header>
    <div class="center">
        <h1>SEMI*</h1>
    </div>
    <div class="right">
        <button>User Guide</button>
        <button>Preview</button>
    </div>
</header>

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
</style>