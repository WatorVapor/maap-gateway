const Level = require('level').Level;
const DIDGuestDocument = require('./did/document.js').DIDGuestDocument;
const evidence = require('./did/evidence.js')
const ChainOfEvidence = evidence.ChainOfEvidence;
const Evidence = evidence.ChainOfEvidence;


const process = require('process');

if(process.argv.length < 3) {
  process.exit(0);
}
const address = process.argv[2];
console.log(':::: address:=<',address,'>');

/*
const chainStore = new Level('maap_evidence_chain', { valueEncoding: 'json' });
//console.log(':::: chainStore:=<',chainStore,'>');
*/

const coc = new ChainOfEvidence();
console.log(':::: coc:=<',coc,'>');
coc.joinDid(address,()=>{
  
})

process.on('beforeExit', (code) => {
  coc.destroy();
  console.log('Process beforeExit event with code: ', code);
});
process.on('exit', (code) => {
  console.log('Process exit event with code: ', code);
});


/*
const loadGuestDocument = async () => {
  await chainStore.open();
  //console.log('::loadGuestDocument::chainStore.status:=<',chainStore.status,'>');
  try {
    const chainTopStr = await chainStore.get('top');
    //console.log('::loadGuestDocument::chainTopStr:=<',chainTopStr,'>');
    if(chainTopStr) {
      const chainTop = JSON.parse(chainTopStr);
      //console.log('::loadGuestDocument::chainTop:=<',chainTop,'>');
      if(chainTop && chainTop.id) {
        if(chainTop.id.endsWith(address)) {
          return onGoodGuestDid(chainTop);
        }
      }
    }
  } catch (err) {
    console.log('::loadGuestDocument::err:=<',err,'>');
  }
  createGuestDocument();
}
loadGuestDocument();

const createGuestDocument = async () => {
  const didDoc = new DIDGuestDocument(address, async () => {
    console.log('::createGuestDocument::didDoc.document():=<',JSON.stringify(didDoc.document(),undefined,2),'>');
    await chainStore.put('top',JSON.stringify(didDoc.document()));
    onGoodGuestDid(didDoc.document());
  });  
}

const onGoodGuestDid = (chainTop) => {
  console.log('::onGoodGuestDid::chainTop:=<',chainTop,'>');
  //const service = chainTop.service;
  //console.log('::onGoodGuestDid::service:=<',service,'>');
}
*/

