<script>

    import { onMount } from 'svelte';
    export let isGenerating = false;
    let points = 0;
    function run(){
        setInterval(() => {
            points++;
            if( points > 3 ){
                points = 0;
            }
        }, 800);
    }
    onMount(()=>{
        run();
    });

</script>

<div class="preview">
    <div>
        {#if isGenerating}
            Generating {('....').substring(0,points)}
        {:else}
            Please define your design
        {/if}    
    </div>
</div>

<style lang="scss">

.preview {
    background-color: #eee;
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: sticky;
    top: 0;
}

</style>