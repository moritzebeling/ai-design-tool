<script context="module">
</script>

<script>

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    import Slider from '$lib/Slider.svelte';

    let displayed = [];

    function updateNumSliders( event ){
        displayed = sliders;
        displayed = displayed.slice( 0, event.detail);
    }

    let sliders = [
        'Era',
        'Complexity',
        'Absurdity',
        'Materiality',
        'Q-Structure',
        'Level',
        'Order',
        'Style-semantic ralationship',
        'Contemporary Appriximator',
        'Noise injection',
        'Aether path deriviation',
        'Nostalica',
        'Romance',
    ];

    function onchange( event ){
        dispatch('update', event.detail);
    }

</script>

<div class="controls">

    <Slider name="Slider" on:update={updateNumSliders} max={sliders.length} />

    {#each displayed as item}
        <Slider name="{item}" on:update={onchange} />
    {/each}

</div>

<style lang="scss">
</style>