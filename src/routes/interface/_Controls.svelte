<script>

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    import Slider from '$lib/Slider.svelte';
    import Group from './_Group.svelte';

    let displayed = [];

    function updateNumSliders( event ){
        displayed = sliders;
        displayed = displayed.slice( 0, event.detail);
    }

    let sliders = [
        'Amount of text',
        'Cleanliness',
        'Loudness',
        'Warmness',
        'Colorfullness',
        'Professionality',
        'Modernness',
        'Number of supporter logos',
    ];

    function onchange( event ){
        dispatch('update', event.detail);
    }

</script>

<div class="controls">

    <Slider name="Complexity Control" on:update={updateNumSliders} max={sliders.length} />

    {#each displayed as item}
        <Group name="{item}" on:update={onchange} />
    {/each}

</div>

<style lang="scss">

</style>