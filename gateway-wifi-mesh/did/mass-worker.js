import nacl from 'https://cdn.jsdelivr.net/npm/tweetnacl-es6@1.0.3/nacl-fast-es.min.js';
const MassWoker = {
  trace:false,
  debug:false
};
if(MassWoker.trace) {
  console.log('::::nacl=<',nacl,'>');
}

const createMassKey_ = () => {
  const keyPair = nacl.sign.keyPair();
  if(MassWoker.trace) {
    console.log('MassWoker::createMassKey_:keyPair=<',keyPair,'>');
  }
  self.postMessage(keyPair);
}

self.addEventListener('message', (e) =>{
  if(MassWoker.trace) {
    console.log('MassWoker::::e=<',e,'>');
  }
  if(e.data.cmd === 'createKey') {
    createMassKey_();
  }  
}, false);
