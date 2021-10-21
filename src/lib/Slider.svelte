<script>

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    export let name = "Slider";
    export let min = 0;
    export let max = 100;
    export let value = 0;

    let id = `slider-${name.toLowerCase()}`;

    function onchange(event){
        dispatch('update', event.target.value);
    }

</script>

<div class="field">
    <label for="{id}">{name}</label>
    <input type="range" {min} {max} {value} on:change={onchange}>
</div>

<style lang="scss">

    .field {
        margin: 1rem;
        display: flex;
    }
    label {
        flex: 1 0 30%;
    }
    input {
        flex: 1 0 70%;
    }

</style>