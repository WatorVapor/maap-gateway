const process = require('process');
const evidence = require('./did/evidence.js')
const ChainOfEvidence = evidence.ChainOfEvidence;

process.on('beforeExit', (code) => {
  coc.destroy();
  console.log('Process beforeExit event with code: ', code);
});
process.on('exit', (code) => {
  console.log('Process exit event with code: ', code);
});

const coc = new ChainOfEvidence();
console.log(':::: coc:=<',coc,'>');
setTimeout(()=>{
  start();
},0);


const start = async () => {
  await coc.load();
  console.log('::start: coc.topEvidence_:=<',coc.topEvidence_,'>');  
  console.log('::start: coc.topEvidence_.coc_:=<',coc.topEvidence_.coc_,'>');
  setTimeout(()=>{
  },1000*10);
}
