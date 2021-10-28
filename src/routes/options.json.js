import path from "path";
import fs from "fs";
import YAML from 'yaml';
import { validateFields } from '$lib/helpers.js';

function readFile(fileName){
    return fs.readFileSync(
        path.resolve("settings/", fileName),
        "utf-8"
    );
};

export async function get({params}) {

    const file = readFile(`options.yml`);
    let data = YAML.parse(file);

    const fields = validateFields( data );

    return {
        body: fields
    };

}