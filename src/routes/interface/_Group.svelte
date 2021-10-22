<script>

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    import Slider from '$lib/Slider.svelte';

    export let name = "Slider";
    export let min = 0;
    export let max = 100;
    export let value = 0;

    let id = `slider-${name.toLowerCase()}`;

    function onchange( event ){
        dispatch('update', event.detail);
    }

    function getGroup(){
        let op = [
            'Level',
            'Path',
            'Control',
            'Optionality',
            'Height',
            'Width',
            'Coolness',
            'Gain',
            'Gain',
        ];
        op = op.sort((a, b) => 0.5 - Math.random());
        let cut = Math.floor( Math.random() * (op.length - 1) ) + 1;
        return op.slice(0,cut);
    }
    let options = getGroup();

    let show = false;

</script>

<section>

    <Slider {name} on:update={onchange} {max} {min} {value} />

    {#if show}
        <div class="options">
            {#each options as item}
                <Slider name="{item}" on:update={onchange} />
            {/each}
        </div>
    {:else}
        <button on:click={() => { show = true }}>More Options</button>
    {/if}

</section>

<style lang="scss">

    section {
        margin: 0.5rem 0;
        background-color: #eee;
        padding: 0.5rem 1rem;
        border-radius: 1rem;
    }
    .options {
        margin-left: 2rem;
    }

</style>