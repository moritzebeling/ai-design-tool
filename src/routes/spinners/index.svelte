<script context="module">

    export const prerender = true;
    export const ssr = true;

</script>

<script>

    import { onMount } from 'svelte';

    import { BarLoader } from './_spinners/index.js';
    import { Chasing } from './_spinners/index.js';
    import { Circle } from './_spinners/index.js';
    import { Circle2 } from './_spinners/index.js';
    import { Circle3 } from './_spinners/index.js';
    import { DoubleBounce } from './_spinners/index.js';
    import { Firework } from './_spinners/index.js';
    import { Jellyfish } from './_spinners/index.js';
    import { Jumper } from './_spinners/index.js';
    import { Pulse } from './_spinners/index.js';
    import { Rainbow } from './_spinners/index.js';
    import { RingLoader } from './_spinners/index.js';
    import { ScaleOut } from './_spinners/index.js';
    import { Shadow } from './_spinners/index.js';
    import { SpinLine } from './_spinners/index.js';
    import { Stretch } from './_spinners/index.js';
    import { SyncLoader } from './_spinners/index.js';
    import { Wave } from './_spinners/index.js';
    import { Square } from './_spinners/index.js';
    import { Moon } from './_spinners/index.js';

    let spinners = [
        BarLoader,
        Chasing,
        Circle,
        Circle2,
        Circle3,
        DoubleBounce,
        Firework,
        Jellyfish,
        Jumper,
        Pulse,
        Rainbow,
        RingLoader,
        ScaleOut,
        Shadow,
        SpinLine,
        Stretch,
        SyncLoader,
        Wave,
        Square,
        Moon,
    ];

    let colors = [
        '#F1F1F1',
        '#86ACFF',
        '#905EFF',
        '#60E3E2',
        '#78FFA8',
        '#FF7E6A',
        '#FF99FF'
    ];

    function select( arr ){
        return arr[Math.floor(Math.random()*arr.length)];
    }

    let Spinner = select( spinners );
    let color = select( colors );

    onMount(()=>{
        setInterval(() => {
            Spinner = select( spinners );
            color = select( colors );
        }, 7500);
    });

</script>
     
<div class="wrapper">
    <header>
        <h1>SEMI*</h1>
    </header>
    <main>
        <svelte:component this={Spinner} size="300" unit="px" {color} />
    </main>
    <footer>
        <h3>Live preivew is generating</h3>
    </footer>
</div>

<style lang="scss">

    .wrapper {
        height: 100vh;
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 2rem;
    }
    header, main, footer {
        padding: 1rem;
        text-align: center;
    }
    h1 {
        font-size: 8rem;
    }
    footer {
        font-size: 2rem;
    }
    main {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 4rem;
    }

</style>