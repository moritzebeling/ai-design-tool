<script>

    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import { Animation } from '$lib/SliderAnimation.js';
    import Popup from '$lib/Popup.svelte';
    import Group from '$lib/Group.svelte';
    import Video from '$lib/Video.svelte';
    import { randomItem, randomColor, randomOptions } from './helpers.js';

    export let id;
    export let label = "Slider";
    export let min = 0;
    export let max = 100;
    export let value = 0;
    export let from = 'From';
    export let to = 'To';
    export let options = randomOptions();
    
    let showOptions = false;

    let anim, element;
    onMount(()=>{
        anim = new Animation( element, min, max, value );
        return ()=>{
            anim.destroy();
        }
    });

</script>

<div class="field">

    <div class="title">
        <label for={id}>{label}</label>
        {#if options !== false}
            <button on:click={()=>showOptions = !showOptions}>
                {#if showOptions}
                    –
                {:else}
                    +
                {/if}
                {options.type}
            </button>
        {/if}
    </div>

    <input {id} type="range" bind:this={element} {min} {max} {value} step="0.1">

    <div class="labels">
        <label>{from}</label>
        <label>{to}</label>
    </div>

    {#if showOptions && options !== false}
        {#if options.type === 'sliders'}
                <Popup title="{label} Options" on:close="{()=> showOptions = false }" color={randomColor()}>
                    <Group options={options.sliders} />
                </Popup>
        {:else if options.type === 'video'}
            <Popup title="{label} Options" on:close="{()=> showOptions = false }" color={randomColor()} size="small">
                <Video {options} />
            </Popup>
        {/if}
    {/if}

</div>

<style lang="scss">

    .field {
        width: 100%;
        padding-top: 1rem;
    }
    .title {
        display: flex;
        justify-content: space-between;
        align-items: top;
        label {
            @include font-bold;
        }
    }
    label {
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    .labels {
        display: flex;
        justify-content: space-between;
        white-space: nowrap;
        label + label {
            text-align: right;
        }
    }
    input {
        -webkit-appearance: none;
        width: 100%;
        height: 0.5rem;
        margin: 0;
        outline: none;
        -webkit-transition: .2s;
        transition: opacity .2s;
        position: relative;
        margin: 1rem 0;
        &:after {
            content: '';
            position: absolute;
            top: 50%;
            height: 2px;
            width: 100%;
            background: var(--color1);
            z-index: -1;
        }
    }
    input::-webkit-slider-thumb {
        -webkit-appearance: none;
        border-radius: 2rem;
        appearance: none;
        width: 3rem;
        height: 3rem;
        background: $color2;
        background: radial-gradient(50% 50% at 50% 50%, $color2 10%, rgb($color2, 60%) 30%, rgb($color2, 0%) 100%);
        cursor: pointer;
    }
    input::-moz-range-thumb {
        width: 3rem;
        height: 3rem;
        border-radius: 2rem;
        background: $color2;
        background: radial-gradient(50% 50% at 50% 50%, $color2 10%, rgb($color2, 60%) 30%, rgb($color2, 0%) 100%);
        cursor: pointer;
    }


</style>