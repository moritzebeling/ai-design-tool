<script>

    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import { Animation } from '$lib/SliderAnimation.js';
    import Group from '$lib/Group.svelte';

    export let id;
    export let label = "Slider";
    export let min = 0;
    export let max = 100;
    export let value = 0;
    export let from = 'From';
    export let to = 'To';
    export let options = [];

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
        <div class="options" transition:slide="{{duration: 300}}">
            <Group {options} />
        </div>
    {/if}

</div>

<style lang="scss">

    .field {
        width: 100%;
        border-top: 1px solid $light;
        padding-top: 1.5rem;
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
        border-left: 2px solid $color;
        border-right: 2px solid $color;
        margin: 1rem 0;
        &:after {
            content: '';
            position: absolute;
            top: 50%;
            height: 2px;
            width: 100%;
            background-color: $stroke;
            z-index: -1;
        }
    }
    input::-webkit-slider-thumb {
        -webkit-appearance: none;
        border-radius: 2rem;
        appearance: none;
        width: 2rem;
        height: 2rem;
        background: $color;
        cursor: pointer;
    }
    input::-moz-range-thumb {
        width: 2rem;
        height: 2rem;
        border-radius: 2rem;
        background: $color;
        cursor: pointer;
    }


</style>