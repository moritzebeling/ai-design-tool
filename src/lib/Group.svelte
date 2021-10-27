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
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-top: 0.5rem;
    }

</style>