<script>

    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import { Animation } from '$lib/SliderAnimation.js';
    import Popup from '$lib/Popup.svelte';
    import Group from '$lib/Group.svelte';
    import { randomItem } from './helpers.js';

    export let id;
    export let label = "Slider";
    export let min = 0;
    export let max = 100;
    export let value = 0;
    export let from = 'From';
    export let to = 'To';
    export let options = [];

    export let color = '#00f';

    let showOptions = false;

    let anim, element;
    onMount(()=>{
        anim = new Animation( element, min, max, value );
        return ()=>{
            anim.destroy();
        }
    });

</script>

<div class="field" style="--color:{color};">

    <div class="title">
        <label for={id}>{label}</label>
        {#if options.length > 0}
            <button on:click={()=>showOptions = !showOptions}>
                {#if showOptions}
                    –
                {:else}
                    +
                {/if}
            </button>
        {/if}
    </div>

    <input {id} type="range" bind:this={element} {min} {max} {value} step="0.1">

    <div class="labels">
        <label>{from}</label>
        <label>{to}</label>
    </div>

    {#if showOptions && options.length > 0}
        <Popup title="{label} Options" on:close="{()=> showOptions = false }">
            <Group {options} />
        </Popup>
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
    .labels {
        display: flex;
        justify-content: space-between;
        label + label {
            text-align: right;
        }
    }
    input {
        -webkit-appearance: none;
        width: 100%;
        height: 2rem;
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
            background: $color1;
            z-index: -1;
        }
    }
    input::-webkit-slider-thumb {
        -webkit-appearance: none;
        border-radius: 2rem;
        appearance: none;
        width: 3rem;
        height: 3rem;
        background: #FF99FF;
        background: radial-gradient(50% 50% at 50% 50%, #FF99FF 0%, rgba(255, 153, 255, 0.572917) 27.6%, rgba(255, 153, 255, 0) 100%);
        cursor: pointer;
    }
    input::-moz-range-thumb {
        width: 3rem;
        height: 3rem;
        border-radius: 2rem;
        background: #FF99FF;
        background: radial-gradient(50% 50% at 50% 50%, #FF99FF 0%, rgba(255, 153, 255, 0.572917) 27.6%, rgba(255, 153, 255, 0) 100%);
        cursor: pointer;
    }


</style>