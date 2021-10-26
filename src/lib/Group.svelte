<script>

    import Slider from '$lib/Slider.svelte';
 
    export let options = [];

</script>

<section>

    {#each options as option}
        <Slider {...option} />
    {/each}

</section>

<style lang="scss">

    section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

</style>