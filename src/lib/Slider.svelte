<script>

    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import Group from '$lib/Group.svelte';
    import { Animation } from '$lib/SliderAnimation.js';

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
        <h4 class="label">{label}</h4>
        {#if options.length > 0}
            <button on:click={()=>showOptions = !showOptions}>Options</button>
        {/if}
    </div>

    <input {id} type="range" bind:this={element} {min} {max} {value} step="0.1" on:change={onchange}>

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

    $color: #000;

    .field {
        width: 100%;
        border-top: 1px solid #000;
        padding-top: 0.5rem;
    }
    .label {
        margin-bottom: 0.5rem;
    }
    .title {
        display: flex;
        justify-content: space-between;
        align-items: top;
    }
    .labels {
        margin-top: 0.5rem;
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
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
        &:after {
            content: '';
            position: absolute;
            top: 50%;
            height: 2px;
            width: 100%;
            background-color: #000;
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

    button {
        border-radius: 0;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-color: transparent;
        outline: none;
        font: inherit;
        border: 0;
        padding: 0;
        margin: 0;
        font-size: 0.7rem;
        display: block;
        line-height: inherit;
        &:before {
            content: '[';
        }
        &:after {
            content: ']';
        }
    }

</style>