const doc = require('./did/document.js');
console.log(':::: doc:=<',doc,'>');
if(process.argv.length < 3) {
  process.exit(0);
}
const address = process.argv[2];
console.log(':::: address:=<',address,'>');
const guest = new doc.DIDGuestDocument(address,()=>{
  console.log(':::: guest:=<',guest,'>');
});

