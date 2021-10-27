<script>

    import Slider from '$lib/Slider.svelte';
    import { randomInt } from '$lib/helpers.js';
 
    export let options = [];

</script>

<section class="grid">

    {#each options as option}
        <div class="col-{option.width}">
            <Slider {...option} />
        </div>
    {/each}

</section>

<style lang="scss">
</style>