const evidence = require('./did/evidence.js')
const ChainOfEvidence = evidence.ChainOfEvidence;

const coc = new ChainOfEvidence(() => {
  console.log(':::: coc:=<',coc,'>');
});




const process = require('process');
process.on('beforeExit', (code) => {
  coc.destroy();
  console.log('Process beforeExit event with code: ', code);
});
process.on('exit', (code) => {
  console.log('Process exit event with code: ', code);
});
