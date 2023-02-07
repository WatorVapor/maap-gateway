const iConstOneDayMs = 1000*3600*24;
const Level = require('level').Level;
console.log('::::Level=<',Level,'>');
const nacl = require('tweetnacl');
console.log('::::nacl=<',nacl,'>');
nacl.util = require('tweetnacl-util');
console.log('::::nacl.util=<',nacl.util,'>');
const CryptoJS = require('crypto-js');
const base32 = require('base32.js');

class MassStore {
  static trace = false;
  static debug = false;
  static debug2 = true;
  static store_prefix = 'eddsa';
  constructor(keyAddress,readycb) {
    this.readyCB_ = readycb;
    this.massStore_ = new Level('maap_mass_store', { valueEncoding: 'json' });
    if(MassStore.trace) {
      console.log('MassStore::constructor::this.massStore_=<',this.massStore_,'>');
    }
    if(keyAddress) {
      this.secretKeyPath_ = `${MassStore.store_prefix}/${keyAddress}/secretKey`;
      this.publicKeyPath_ = `${MassStore.store_prefix}/${keyAddress}/publicKey`;
      this.addressPath_ = `${MassStore.store_prefix}/${keyAddress}/address`;
      if(MassStore.trace) {
        console.log('MassStore::constructor::this.secretKeyPath_=<',this.secretKeyPath_,'>');
        console.log('MassStore::constructor::this.publicKeyPath_=<',this.publicKeyPath_,'>');
        console.log('MassStore::constructor::this.addressPath_=<',this.addressPath_,'>');
      }
      setTimeout(()=>{
        this.loadMassStoreKey_();
      },0);
    } else {
      this.createMassStoreKey_();
    }
  }
  sign(msgOrig) {
    msgOrig.ts = new Date().toISOString();
    return this.signWithoutTS(msgOrig);
  }
  signWithoutTS(msgOrig) {
    const msgOrigStr = JSON.stringify(msgOrig);
    const encoder = new TextEncoder();
    const hash = nacl.hash(encoder.encode(msgOrigStr));
    if(MassStore.debug) {
      console.log('MassStore::sign::hash=<',hash,'>');
    }
    const hash512B64 = nacl.util.encodeBase64(hash);
    if(MassStore.debug) {
      console.log('MassStore::sign::hash512B64=<',hash512B64,'>');
    }
    const sha1MsgB64 = CryptoJS.SHA1(hash512B64).toString(CryptoJS.enc.Base64);
    if(MassStore.debug) {
      console.log('MassStore::sign::sha1MsgB64=<',sha1MsgB64,'>');
    }
    const sha1MsgBin = nacl.util.decodeBase64(sha1MsgB64);;
    const signed = nacl.sign(sha1MsgBin,this.secretKey_);
    if(MassStore.debug) {
      console.log('MassStore::sign::signed=<',signed,'>');
    }
    const signedB64 = nacl.util.encodeBase64(signed);
    const signMsgObj = JSON.parse(msgOrigStr);
    signMsgObj.auth = {};
    signMsgObj.auth.pub = this.publicKeyB64_;
    signMsgObj.auth.sign = signedB64;
    return signMsgObj;
  }

  verify(msg) {
    //console.log('MassStore::verify::msg=<',msg,'>');
    const created_at = new Date(msg.ts);
    const now = new Date();
    const escape_ms = now - created_at;
    //console.log('MassStore::verify::escape_ms=<',escape_ms,'>');
    if(escape_ms > iConstOneDayMs) {
      console.log('MassStore::verify::escape_ms=<',escape_ms,'>');
      return false;
    } 
    const calcAddress = this.calcAddress_(msg.auth.pub);
    //console.log('MassStore::verify::calcAddress=<',calcAddress,'>');
    if(!calcAddress.startsWith('mp')) {
      console.log('MassStore::verify::calcAddress=<',calcAddress,'>');
      return false;
    }
    const publicKey = nacl.util.decodeBase64(msg.auth.pub);
    const signMsg = nacl.util.decodeBase64(msg.auth.sign);
    //console.log('MassStore::verify::publicKey=<',publicKey,'>');
    //console.log('MassStore::verify::signMsg=<',signMsg,'>');
    const signedHash = nacl.sign.open(signMsg,publicKey);
    if(!signedHash) {
      console.log('MassStore::verify::signedHash=<',signedHash,'>');
      return false;
    }
    const signedHashB64 = nacl.util.encodeBase64(signedHash);
    //console.log('MassStore::verify::signedHashB64=<',signedHashB64,'>');
    
    const msgCal = Object.assign({},msg);
    delete msgCal.auth;
    const msgCalcStr = JSON.stringify(msgCal);
    const encoder = new TextEncoder();
    const hashCalc = nacl.hash(encoder.encode(msgCalcStr));
    //console.log('MassStore::verify::hashCalc=<',hashCalc,'>');
    const hashCalc512B64 = nacl.util.encodeBase64(hashCalc);
    //console.log('MassStore::verify::hashCalc512B64=<',hashCalc512B64,'>');
    const hashCalclB64 = CryptoJS.SHA1(hashCalc512B64).toString(CryptoJS.enc.Base64);   
    if(signedHashB64 === hashCalclB64) {
      msg.from = calcAddress;
      return true;
    } else {
      console.log('MassStore::verify::signedHashB64=<',signedHashB64,'>');
      console.log('MassStore::verify::hashCalclB64=<',hashCalclB64,'>');
    }
    return false;
  }
  load(secretKey) {
    if(MassStore.debug) {
      console.log('MassStore::load::secretKey=<',secretKey,'>');
    }
    const secretBin = nacl.util.decodeBase64(secretKey);
    if(MassStore.debug) {
      console.log('MassStore::load::secretBin=<',secretBin,'>');
    }
    const keyPair = nacl.sign.keyPair.fromSecretKey(secretBin);
    if(MassStore.debug) {
      console.log('MassStore::load::keyPair=<',keyPair,'>');
    }
    this.secretKey_ = keyPair.secretKey;
    this.publicKey_ = keyPair.publicKey;
    const b64Pub = nacl.util.encodeBase64(keyPair.publicKey);
    if(MassStore.debug) {
      console.log('MassStore::load:b64Pub=<',b64Pub,'>');
    }
    this.publicKeyB64_ = b64Pub;
    const address = this.calcAddress_(b64Pub);
    this.address_ = address;
    return address;
  }
  pub() {
    return this.pubKeyB64_;
  }
  secret() {
    return this.priKeyB64_;
  }
  address() {
    return this.address_;
  }
  destory() {
    this.massStore_.removeItem(this.secretKeyPath_);
    this.massStore_.removeItem(this.publicKeyPath_);
    this.massStore_.removeItem(this.addressPath_);
  }
  randomId() {
    const randomBytes = nacl.randomBytes(1024);
    const randomB64 = nacl.util.encodeBase64(randomBytes);
    const randomAdd = this.calcAddress_(randomB64);
    return randomAdd;
  }
  
  async createMassStoreKey_() {
    this.mineMassStoreKey_();
  }
 
  async mineMassStoreKey_() {
    while(true) {
      const keyPair = nacl.sign.keyPair();
      if(MassStore.trace) {
        console.log('MassStore::mineMassStoreKey_:keyPair=<',keyPair,'>');
      }
      const b64Pub = nacl.util.encodeBase64(keyPair.publicKey);
      const address = this.calcAddress_(b64Pub);
      if(MassStore.debug2) {
        console.log('MassStore::mineMassStoreKey_:address=<',address,'>');
      }
      if(address.startsWith('mp')) {
        await this.save2Storage_(keyPair);
        await this.loadMassStoreKey_();
        break;
      } else {
      }
    }
  }  
  async save2Storage_(keyPair){
    const ready = await this.massStore_.open();
    if(MassStore.trace) {
      console.log('MassStore::save2Storage_:this.massStore_=<',this.massStore_,'>');
    }
    const b64Pri = nacl.util.encodeBase64(keyPair.secretKey);
    if(MassStore.debug) {
      console.log('MassStore::save2Storage_:b64Pri=<',b64Pri,'>');
    }
    const b64Pub = nacl.util.encodeBase64(keyPair.publicKey);
    if(MassStore.debug) {
      console.log('MassStore::save2Storage_:b64Pub=<',b64Pub,'>');
    }
    const address = this.calcAddress_(b64Pub);
    if(MassStore.debug) {
      console.log('MassStore::save2Storage_:address=<',address,'>');
    }
    this.secretKeyPath_ = `${MassStore.store_prefix}/${address}/secretKey`;
    this.publicKeyPath_ = `${MassStore.store_prefix}/${address}/publicKey`;
    this.addressPath_ = `${MassStore.store_prefix}/${address}/address`;
    if(MassStore.trace) {
      console.log('MassStore::save2Storage_::this.secretKeyPath_=<',this.secretKeyPath_,'>');
      console.log('MassStore::save2Storage_::this.publicKeyPath_=<',this.publicKeyPath_,'>');
      console.log('MassStore::save2Storage_::this.addressPath_=<',this.addressPath_,'>');
    }
    await this.massStore_.put(this.publicKeyPath_,b64Pub);
    await this.massStore_.put(this.secretKeyPath_,b64Pri);    
    await this.massStore_.put(this.addressPath_,address);
    return address;
  }
  
  async loadMassStoreKey_() {
    try {
      await this.massStore_.open();
      if(MassStore.debug) {
        console.log('MassStore::loadMassStoreKey_:this.massStore_=<',this.massStore_,'>');
      }
      if(MassStore.debug2) {
        console.log('MassStore::loadMassStoreKey_:this.massStore_.status=<',this.massStore_.status,'>');
      }
      const address = await this.massStore_.get(this.addressPath_);
      if(MassStore.debug) {
        console.log('MassStore::loadMassStoreKey_:this.massStore_=<',this.massStore_,'>');
        console.log('MassStore::loadMassStoreKey_:this.addressPath_=<',this.addressPath_,'>');
        console.log('MassStore::loadMassStoreKey_:address=<',address,'>');
      }
      if(!address) {
        if(typeof this.readyCB_ === 'function') {
          this.readyCB_(false);
        }
        return;
      }
      this.address_ = address;
      const PriKey = await this.massStore_.get(this.secretKeyPath_);
      if(MassStore.debug) {
        console.log('MassStore::loadMassStoreKey_:this.massStore_=<',this.massStore_,'>');
        console.log('MassStore::loadMassStoreKey_:this.secretKeyPath_=<',this.secretKeyPath_,'>');
        console.log('MassStore::loadMassStoreKey_:PriKey=<',PriKey,'>');
      }
      this.priKeyB64_ = PriKey;
      this.priKey_ = nacl.util.decodeBase64(PriKey);
      if(MassStore.debug) {
        console.log('MassStore::loadMassStoreKey_:this.priKey_=<',this.priKey_,'>');
      }
      const keyPair = nacl.sign.keyPair.fromSecretKey(this.priKey_);
      if(MassStore.debug) {
        console.log('MassStore::loadMassStoreKey_:keyPair=<',keyPair,'>');
      }    
      this.secretKey_ = keyPair.secretKey;
      this.publicKey_ = keyPair.publicKey;
      const pubKey = await this.massStore_.get(this.publicKeyPath_);
      if(MassStore.debug) {
        console.log('MassStore::loadMassStoreKey_:pubKey=<',pubKey,'>');
      }
      this.pubKeyB64_ = pubKey;
      this.publicKeyB64_ = pubKey;
      this.pubKey_ = nacl.util.decodeBase64(pubKey);
    } catch(err) {
      console.error('MassStore::loadMassStoreKey_:err=<',err,'>');
      if(typeof this.readyCB_ === 'function') {
        this.readyCB_(false);
      }
      return false;
    }
    if(MassStore.trace) {
      console.log('MassStore::loadMassStoreKey_:this.readyCB_=<',this.readyCB_,'>');
    }    
    if(typeof this.readyCB_ === 'function') {
      this.readyCB_(true);
    }
    return true;
  }
  calcAddress_(b64Pub) {
    const binPub = nacl.util.decodeBase64(b64Pub);
    const hash512 = nacl.hash(binPub);
    const hash512B64 = nacl.util.encodeBase64(hash512);
    const hash1Pub = CryptoJS.SHA1(hash512B64).toString(CryptoJS.enc.Base64);
    if(MassStore.trace) {
      console.log('MassStore::calcAddress_:hash1Pub=<',hash1Pub,'>');
    }
    const hash1pubBuffer = nacl.util.decodeBase64(hash1Pub);
    if(MassStore.trace) {
      console.log('MassStore::calcAddress_:hash1pubBuffer=<',hash1pubBuffer,'>');
    }
    const encoder = new base32.Encoder({ type: "rfc4648", lc: true });
    const address = encoder.write(hash1pubBuffer).finalize();
    if(MassStore.trace) {
      console.log('MassStore::calcAddress_:address=<',address,'>');
    }
    return address;
  }
}
module.exports = {
  MassStore:MassStore
};