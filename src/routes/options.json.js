import path from "path";
import fs from "fs";
import YAML from 'yaml';

function randomInt(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

const defaults = {
    label: 'Slider',
    type: 'slider',
    min: 0,
    max: 100,
    from: '',
    to: '',
};

function getPost(fileName){
    return fs.readFileSync(
        path.resolve("settings/", fileName),
        "utf-8"
    );
};

function validateField( field, id = undefined ){
    field = {
        ...defaults,
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
    value
    */
    if( !('value' in field) ){
        field.value = randomInt( field.min, field.max );
    }

    return field;
}

function validateFields( fields ){
    if( typeof fields === 'array' ){
        return fields.map( field => validateField(field) );
    } else if( typeof fields === 'object' ){
        return Object.entries( fields ).map( entry => validateField( entry[1], entry[0] ) );
    }
    return [];
}

export async function get({params}) {

    const file = getPost(`options.yml`);
    let data = YAML.parse(file);

    fields = validateFields( data );

    return {
        body: fields
    };

}