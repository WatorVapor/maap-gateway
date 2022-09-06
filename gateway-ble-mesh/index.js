

const Graviton = require('./graviton.js');
const graviton = new Graviton( (channel,message) => {
  console.log('::::graviton channel:=<',channel,'>');
  console.log('::::graviton message:=<',message,'>');
});
