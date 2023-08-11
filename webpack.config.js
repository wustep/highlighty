const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        background: path.join(__dirname, "src", "background.ts"),
        highlighty: path.join(__dirname, "src", "highlighty.ts"),
        options: path.join(__dirname, "src", "options.js"),
    },
    devtool: 'inline-source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/info.html',
            filename: 'info.html',
            inject: false
        }),
        new HtmlWebpackPlugin({
            template: './src/options.html',
            filename: 'options.html',
            inject: false
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'src/options.css', to: 'options.css' },
                { from: 'src/img', to: 'img' },
                { from: 'src/lib', to: 'lib' }
            ],
        }),
    ],
};