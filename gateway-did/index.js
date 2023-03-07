const process = require('process');
const evidence = require('./did/evidence.js')
const ChainOfEvidence = evidence.ChainOfEvidence;
const LOG = {
  trace:false,
  debug:true,
}

process.on('beforeExit', (code) => {
  coc.destroy();
  console.log('Process beforeExit event with code: ', code);
});
process.on('exit', (code) => {
  console.log('Process exit event with code: ', code);
});

const coc = new ChainOfEvidence();
console.log(':::: coc.topEvidence_:=<',coc.topEvidence_,'>');
setTimeout(()=>{
  start();
},0);


const start = async () => {
  await coc.load();
  if(LOG.trace) {
    console.log('::start: coc.topEvidence_:=<',coc.topEvidence_,'>');
  }
  if(LOG.debug) {
    const topCocPretty = JSON.stringify(coc.topEvidence_.coc_,undefined,2);
    console.log('::start: topCocPretty:=<',topCocPretty,'>');
  }
  setTimeout(()=>{
  },1000*10);
  
  setInterval(()=>{
    onCheckMissBlock();
  },1000*10);
}

const onCheckMissBlock = () => {
  if(LOG.trace) {
    console.log('::onCheckMissBlock::coc.allBlocks_:=<',coc.allBlocks_,'>');
  }
  for(const block of coc.allBlocks_) {
    const address = coc.topEvidence_.calcAddress(block);
    if(LOG.debug) {
      console.log('::onCheckMissBlock::block:=<',block,'>');
      console.log('::onCheckMissBlock::address:=<',address,'>');
    }
  }
}

