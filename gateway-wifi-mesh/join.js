const process = require('process');
const {randomBytes} = require('crypto')
const evidence = require('./did/evidence.js')
const ChainOfEvidence = evidence.ChainOfEvidence;
if(process.argv.length < 3) {
  process.exit(0);
}
const address = process.argv[2];
console.log('::: address:=<',address,'>');
const coc = new ChainOfEvidence();

const waitLoad = async () => {
  await coc.load();
  console.log('::waitLoad: coc.topEvidence_:=<',coc.topEvidence_,'>');
  await coc.joinDid(address);
  console.log('::waitLoad: coc.topEvidence_:=<',coc.topEvidence_,'>');
  
  // reload
  await coc.load();

  const password = generateRandomString(4);
  console.log('::waitLoad:password: password:=<',password,'>');
  coc.reqJoinTeam(password);
}

waitLoad();


process.on('beforeExit', (code) => {
  coc.destroy();
  console.log('Process beforeExit event with code: ', code);
});
process.on('exit', (code) => {
  console.log('Process exit event with code: ', code);
});

const generateRandomString = (length) => {
  return randomBytes(length).reduce((p, i) => p + (i % 32).toString(32), '')
}

