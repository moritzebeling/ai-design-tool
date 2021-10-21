<script>

    export let name = "Slider";
    export let min = 0;
    export let max = 100;
    export let value = 50;

    let id = `slider-${name.toLowerCase()}`;

</script>

<div class="field">
    <label for="{id}">{name}</label>
    <input type="range" {min} {max} {value}>
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