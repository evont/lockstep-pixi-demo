const path = require('path');
module.exports = {
  devServer: {
    port: 9000,
    open: true,
    hot: false,
    contentBase:  path.join(__dirname, 'public'),
  }
}