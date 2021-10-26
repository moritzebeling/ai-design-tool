<script>

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
    function onchange(event){
        dispatch('update', event.target.value);
    }

    export let name = "Slider";
    export let min = 0;
    export let max = 100;
    export let value = 0;
    export let from = 'From';
    export let to = 'To';

</script>

<div class="field">

    {#if $$slots}
        <h4 class="label">{name}</h4>
    {/if}

    <input type="range" {min} {max} {value} on:change={onchange}>

    <div class="labels">
        <label>{from}</label>
        <label>{to}</label>
    </div>

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
    .labels {
        margin-top: 0.5rem;
        display: flex;
        justify-content: space-between;
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

</style>