import { randomInt } from '$lib/helpers.js';

export class Animation {
    constructor( element, min, max, value ){
        this.element = element;
        this.min = min;
        this.max = max;
        this.value = value;
        this.target = value;
        this.active = true;
        this.que();
    }
    async timeout( ms ){
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async que(){
        if(!this.active){
            return;
        }
        let wait = randomInt(1000, 10000);
        await this.timeout( wait );
        if(this.active){
            this.start();
        }
    }
    start(){
        this.active = true;
        this.target = randomInt( this.min, this.max );
        this.animate();
    }
    async animate(){
        let delta = this.element.value - this.target;
        if( delta > 0 ){
            this.element.value--;
        } else if( delta < 0 ) {
            this.element.value++;
        }
        if( Math.abs(delta) > 1 ){
            let context = this;
            window.requestAnimationFrame( ()=>{
                context.animate();
            });
        } else {
            this.que();
        }
    }
    stop(){
        this.active = false;
    }
    destroy(){
        this.stop();
    }
}