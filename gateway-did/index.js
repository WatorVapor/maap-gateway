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
    syncTopBlock();
  },1000*2);
  
  setInterval(()=>{
    onCheckMissBlock();
  },1000*10);
}

const syncTopBlock = () => {
  if(LOG.debug) {
    console.log('::syncTopBlock::coc.topEvidence_.coc_:=<',coc.topEvidence_.coc_,'>');
  }
  coc.syncTopBlock();
}

const onCheckMissBlock = () => {
  if(LOG.trace) {
    console.log('::onCheckMissBlock::coc.mapBlocks_:=<',coc.mapBlocks_,'>');
  }
  for(const blockAddress in coc.mapBlocks_) {
    //const address = coc.topEvidence_.calcAddress(block);
    const block = coc.mapBlocks_[blockAddress];
    if(LOG.trace) {
      console.log('::onCheckMissBlock::block:=<',block,'>');
      console.log('::onCheckMissBlock::blockAddress:=<',blockAddress,'>');
    }
    const parentAdd = block.parent;
    const hintParent = coc.mapBlocks_[parentAdd];
    if(LOG.trace) {
      console.log('::onCheckMissBlock::hintParent:=<',hintParent,'>');
    }
    if(!hintParent && parentAdd) {
      if(LOG.trace) {
        console.log('::onCheckMissBlock::hintParent:=<',hintParent,'>');
        console.log('::onCheckMissBlock::parentAdd:=<',parentAdd,'>');
      }
      requestSyncStackedBlock(parentAdd);
    } else {
      
    }
  }
}
const requestSyncStackedBlock = (blockAddress) => {
  if(LOG.debug) {
    console.log('::requestSyncStackedBlock::blockAddress:=<',blockAddress,'>');
  }    
  coc.syncStackedBlock(blockAddress);
}


