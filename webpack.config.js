
const path = require('path');

module.exports = {
    mode: 'production',
    entry: './content_script.js',
    // This will output a single file under `dist/bundle.js`
    output: {
        filename: 'content_script.js',
        path: path.resolve(__dirname, 'dist'),
    }
}