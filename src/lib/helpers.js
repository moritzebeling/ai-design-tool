export function randomInt( min = 0, max = 100 ) {
    return Math.floor( Math.random() * (max - min) ) + min;
}

export function randomItem( arr ){
    return arr[ Math.floor( Math.random() * arr.length ) ];
}

export function shuffleArray( arr ){
    return arr.sort( (a, b) => 0.5 - Math.random() );
}

export function randomColor( colors = false ){
    if( colors === false ){
        colors = [
            '#a546ff',
            '#78FFA8',
            '#FF7E6A'
        ];
    }
    return randomItem( colors );
}

export function randomVideo(){
    return randomItem([
        'alert.mp4',
        'circle.mp4',
        'eclectic.mp4',
        'hexagon.mp4',
        'grid.mp4',
        'line.mp4',
        'y.mp4',
    ]);
}

export function randomOptions(){
    if( Math.random() < 0.5 ){
        return false;
    }
    const type = randomItem([
        'sliders',
        'video',
    ]);
    switch (type) {
        case 'video':
            return {
                type: 'video',
                video: randomVideo()
            };
        case 'sliders':
            return {
                type: 'sliders',
                sliders: defaultFields()
            };
    }
}

function validateField( field, id = undefined ){

    field = {
        ...defaultField(),
        ...field
    };

    /*
    id
    */
    if( !('id' in field) ){
        if( id ){
            field.id = id;
        } else {
            field.id = field.label.toLowerCase();
        }
    }
    
    /*
    min, max, value
    */
    field.min = 0;
    field.max = 100;

    /*
    options
    */
    // if( 'options' in field ){
    //     if( field.options.type == 'sliders' ){
    //         field.options.sliders = validateFields( field.options.sliders );
    //     }
    // } else if( Math.random() > 0.8 ) {
    //     field.options = {
    //         type: 'sliders',
    //         sliders: defaultFields()
    //     };
    // }

    return field;
}

export function validateFields( fields ){
    if( Array.isArray( fields ) ){
        return fields.map( field => validateField(field) );
    } else if( Object.prototype.toString.call(fields) === '[object Object]' ){
        return Object.entries( fields ).map( entry => validateField( entry[1], entry[0] ) );
    }
    return [];
}

function defaultField(){
    return {
        label: 'Slider',
        type: 'slider',
        min: 0,
        max: 100,
        value: randomInt(0,100),
        width: randomInt(1,3),
        from: '',
        to: ''
    }
};

function defaultFields(){
    let labels = shuffleArray([
        'Gain',
        'Excess',
        'Path',
        'Control',
        'Level',
        'Depth',
        'Amount',
        'Sigma',
        'Traction',
        'Offset',
        'Detail',
        'Alpha',
        'Semi',
        'Double',
        'Uniqueness',
        'Brightness',
        'Beta',
        'Value',
        'Smooth',
        'Rollover',
        'Size',
        'Connection',
        'Stream',
        'Adjust',
        'X',
        'Y',
        'Z',
        'Space',
        'Opacity',
        'Clearance',
        'Liquidity'
    ]).slice( 0, randomInt(1,4) * 2 );
    let fields = [];
    for (const label of labels) {
        fields.push({
            label: label
        });
    }
    return validateFields( fields );
};