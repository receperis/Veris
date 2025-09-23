
const path = require('path');
var config = {
    // TODO: Add common Configuration
    module: {},
};

var content = Object.assign({}, config, {
    mode: 'production',
    entry: './content_script.js',
    // This will output a single file under `dist/bundle.js`
    output: {
        filename: 'content_script.js',
        path: path.resolve(__dirname, 'dist'),
    }
});

var background = Object.assign({}, config, {
    mode: 'production',
    entry: './background.js',
    // This will output a single file under `dist/bundle.js`
    output: {
        filename: 'background.js',
        path: path.resolve(__dirname, 'dist'),
    }
});



module.exports = [
    content, background,
];