import path from "path";
import fs from "fs";
import YAML from 'yaml';
import { randomInt } from '$lib/helpers.js';

function defaults(){
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

function readFile(fileName){
    return fs.readFileSync(
        path.resolve("settings/", fileName),
        "utf-8"
    );
};

function validateField( field, id = undefined ){

    field = {
        ...defaults(),
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

    return field;
}

function validateFields( fields ){
    if( Array.isArray( fields ) ){
        return fields.map( field => validateField(field) );
    } else if( Object.prototype.toString.call(fields) === '[object Object]' ){
        return Object.entries( fields ).map( entry => validateField( entry[1], entry[0] ) );
    }
    return [];
}

export async function get({params}) {

    const file = readFile(`options.yml`);
    let data = YAML.parse(file);

    const fields = validateFields( data );

    return {
        body: fields
    };

}