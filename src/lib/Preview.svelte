<script>

    export let isGenerating = false;

</script>

<div class="preview">
    <div>
        {#if isGenerating}
            Generating...
        {:else}
            Please define your design
        {/if}    
    </div>
</div>

<style lang="scss">

.preview {
    background-color: #ddd;
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

</style>