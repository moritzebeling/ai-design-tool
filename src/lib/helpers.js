export function randomInt( min = 0, max = 100 ) {
    return Math.floor( Math.random() * (max - min) ) + min;
}

export function randomItem( arr ){
    return arr[ Math.floor( Math.random() * arr.length ) ];
}

export function shuffleArray( arr ){
    return arr.sort( (a, b) => 0.5 - Math.random() );
}