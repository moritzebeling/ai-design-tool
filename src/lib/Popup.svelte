<script>

    import { randomInt } from '$lib/helpers.js';
    import { popupZ } from '$lib/popupStore.js';

    import { onMount, createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
 
    export let title = 'Details';
    export let size = 'medium';
    export let color = '';
    export let top = randomInt( 50, 300 );
    export let left = randomInt( 50, 450 );

    console.log( color );

    export let zindex = $popupZ;
    onMount(()=>{
        popupZ.update(z => z + 1);
    });

    let dragging = false;
    function onMouseDown() {
        dragging = true;
        zindex = $popupZ;
        popupZ.update(z => z + 1);
	}
	function onMouseMove(e) {
		if (dragging) {
			left += e.movementX;
			top += e.movementY;
		}
	}
	function onMouseUp() {
		dragging = false;
	}

</script>

<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />

<aside class="size-{size}" style="top:{top}px;left:{left}px;z-index:{zindex};{color ? `--color1:${color};` : ''}">
    <header>
        <div class="bar" on:mousedown={onMouseDown}>
            <h2>{title}</h2>
        </div>
        <div>
            <button on:click={()=>dispatch('close')}>Close</button>
        </div>
    </header>
    <main>
        <slot />
    </main>
</aside>

<style lang="scss">

    aside {
        position: fixed;
        top: 10vh;
        left: 10vw;
        width: 50vw;
        z-index: 10;
        max-height: 66vh;
        overflow-y: auto;
        background: $background;
        box-shadow: 0 0 20px rgba(255,255,255,0.5);
        border: $border;
        border-radius: 1rem;
        color: var(--color1);
        &.size-small {
            width: 33vw;
        }
        &.size-large {
            width: 66vw;
        }
    }
    header {
        user-select: none;
        border-bottom: $border;
        display: flex;
        > div {
            padding: 0.5rem 1rem;
        }
        .bar {
            flex: 1;
        }
    }
    h2 {
        cursor: grab;
    }
    main {
        padding: 0.5rem;
    }

</style>