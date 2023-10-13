const path = require('path');

module.exports = {
  entry: './public/js/threejs-scene.js', // Entry point for your JavaScript file
  output: {
    filename: 'plane.js', // Output bundle filename
    path: path.resolve(__dirname, 'public/dist'), // Output directory
  },
  devServer: {
    contentBase: './public/dist', // Serve files from this directory
    publicPath: '/js/', // The public path to bundle output (adjust as needed)
    hot: true, // Enable hot module replacement
  },
};
