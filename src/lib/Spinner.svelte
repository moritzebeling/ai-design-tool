<script>

    const range = (size, startAt = 0) => [...Array(size).keys()].map(i => i + startAt);
    let duration = 2;

</script>

<div class="wrapper">
    <div class="spinner">
        {#each range(2, 0) as version}
            <div class="dot" style="animation-delay: {version === 1 ? `${duration / 2}s` : '0s'}; bottom: {version === 1 ? '0' : ''}; top: {version === 1 ? 'auto' : ''};" />
        {/each}
    </div>
</div>

<style lang="scss">
    $size: 2em;
    $duration: 2s;
    .wrapper {
        height: $size;
        width: $size;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
    }
    .spinner {
        height: $size;
        width: $size;
        animation: rotate $duration infinite linear;
    }
    .dot {
        width: 55%;
        height: 55%;
        display: inline-block;
        position: absolute;
        top: 0;
        background-color: $color1;
        border-radius: 100%;
        animation: bounce $duration infinite ease-in-out;
    }
    @keyframes rotate {
        100% {
            transform: rotate(360deg);
        }
    }
    @keyframes bounce {
        0%,
        100% {
            transform: scale(0);
        }
        50% {
            transform: scale(1);
        }
    }
</style>