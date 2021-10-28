<script>
 
    import { randomVideo } from '$lib/helpers.js';

    export let options = {};
    let video = options.video || randomVideo();

</script>

<div>
    <figure>
        <video width="320" height="240" loop autoplay muted>
            <source src="/videos/{video}" type="video/mp4">
        </video>
    </figure>
</div>

<style lang="scss">

    video {
        width: 100%;
        height: auto;
    }

</style>