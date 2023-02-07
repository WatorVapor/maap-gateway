const Level = require('level').Level;
const doc = require('./did/document.js');
//console.log(':::: doc:=<',doc,'>');
if(process.argv.length < 3) {
  process.exit(0);
}
const address = process.argv[2];
console.log(':::: address:=<',address,'>');
const chainStore = new Level('maap_evidence_chain', { valueEncoding: 'json' });
//console.log(':::: chainStore:=<',chainStore,'>');

const loadGuestDocument = async () => {
  await chainStore.open();
  //console.log('::loadGuestDocument::chainStore.status:=<',chainStore.status,'>');
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
  createGuestDocument();
}
loadGuestDocument();

const createGuestDocument = async ()=> {
  const didDoc = new doc.DIDGuestDocument(address, async ()=>{
    console.log('::createGuestDocument::didDoc.document():=<',JSON.stringify(didDoc.document(),undefined,2),'>');
    await chainStore.put('top',JSON.stringify(didDoc.document()));
  });  
}

const onGoodGuestDid = (chainTop) => {
  console.log('::onGoodGuestDid::chainTop:=<',chainTop,'>');  
}
