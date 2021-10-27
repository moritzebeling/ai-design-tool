<script>

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
 
    export let title = 'Details';
    export let size = 'medium';
    export let top = 100;
    export let left = 100;

    let dragging = false;
    function onMouseDown() {
		dragging = true;
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

<aside class="size-{size}" style="top:{top}px;left:{left}px;">
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
        min-height: 33vh;
        max-height: 66vh;
        overflow-y: auto;
        background: $background;
        box-shadow: 10px 10px 0 rgba(0,0,0,0.1);
        border: $border;
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
            padding: 0.5rem;
        }
        .bar {
            flex: 1;
        }
    }
    h2 {
        cursor: grab;
    }
    main {
        padding: 1rem;
    }

</style>