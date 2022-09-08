const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
const CryptoJS = require('crypto-js');
const base32  = require('base32.js');
const fs = require('fs');

class MaapAuth {
  static trace = false;
  static debug = false;
  constructor() {
    this.keyPath_ = './config/keyMaster.json';
    this.loadKey_();
  }
  sign(msgOrig) {
    msgOrig.ts = new Date().toISOString();
    const msgOrigStr = JSON.stringify(msgOrig);
    const encoder = new TextEncoder();
    const hash = nacl.hash(encoder.encode(msgOrigStr));
    if(MaapAuth.debug) {
      console.log('MaapAuth::sign::hash=<',hash,'>');
    }
    const hash512B64 = nacl.util.encodeBase64(hash);
    if(MaapAuth.debug) {
      console.log('MaapAuth::sign::hash512B64=<',hash512B64,'>');
    }
    const sha1MsgB64 = CryptoJS.SHA1(hash512B64).toString(CryptoJS.enc.Base64);
    if(MaapAuth.debug) {
      console.log('MaapAuth::sign::sha1MsgB64=<',sha1MsgB64,'>');
    }
    const sha1MsgBin = nacl.util.decodeBase64(sha1MsgB64);;
    const signed = nacl.sign(sha1MsgBin,this.secBin_);
    if(MaapAuth.debug) {
      console.log('MaapAuth::sign::signed=<',signed,'>');
    }
    const signedB64 = nacl.util.encodeBase64(signed);
    const signMsgObj = JSON.parse(msgOrigStr);
    signMsgObj.auth = {};
    signMsgObj.auth.pub = this.pubB64_;
    signMsgObj.auth.sign = signedB64;
    return signMsgObj;
  }
  verify(msg) {
    if(MaapAuth.debug) {
      console.log('MaapAuth::verify::msg=<',msg,'>');
    }
    const created_at = new Date(msg.ts);
    const now = new Date();
    const escape_ms = now - created_at;
    if(MaapAuth.debug) {
      console.log('MaapAuth::verify::escape_ms=<',escape_ms,'>');
    }
    if(escape_ms > 1000*5) {
      if(MaapAuth.debug) {
        console.log('MaapAuth::verify::escape_ms=<',escape_ms,'>');
      }
      return false;
    } 
    const calcAddress = this.calcAddress_(msg.auth.pub);
    if(MaapAuth.debug) {
      console.log('MaapAuth::verify::calcAddress=<',calcAddress,'>');
    }
    if(!calcAddress.startsWith('mp')) {
      if(MaapAuth.debug) {
        console.log('MaapAuth::verify::calcAddress=<',calcAddress,'>');
      }
      return false;
    }
    const publicKey = nacl.util.decodeBase64(msg.auth.pub);
    const signMsg = nacl.util.decodeBase64(msg.auth.sign);
    if(MaapAuth.debug) {
      console.log('MaapAuth::verify::publicKey=<',publicKey,'>');
      console.log('MaapAuth::verify::signMsg=<',signMsg,'>');
    }
    const signedHash = nacl.sign.open(signMsg,publicKey);
    if(!signedHash) {
      if(MaapAuth.debug) {
        console.log('MaapAuth::verify::signedHash=<',signedHash,'>');
      }
      return false;
    }
    const signedHashB64 = nacl.util.encodeBase64(signedHash);
    if(MaapAuth.debug) {
      console.log('MaapAuth::verify::signedHashB64=<',signedHashB64,'>');
    }
   
    const msgCal = Object.assign({},msg);
    delete msgCal.auth;
    const msgCalcStr = JSON.stringify(msgCal);
    const encoder = new TextEncoder();
    const hashCalc = nacl.hash(encoder.encode(msgCalcStr));
    if(MaapAuth.debug) {
      console.log('MaapAuth::verify::hashCalc=<',hashCalc,'>');
    }
    const hashCalc512B64 = nacl.util.encodeBase64(hashCalc);
    if(MaapAuth.debug) {
      console.log('MaapAuth::verify::hashCalc512B64=<',hashCalc512B64,'>');
    }
    const hashCalclB64 = CryptoJS.SHA1(hashCalc512B64).toString(CryptoJS.enc.Base64);   
    if(signedHashB64 === hashCalclB64) {
      msg.auth_address = calcAddress;
      return true;
    } else {
      console.log('MaapAuth::verify::signedHashB64=<',signedHashB64,'>');
      console.log('MaapAuth::verify::hashCalclB64=<',hashCalclB64,'>');
    }
    return false;
  }
  calcTokenKeyBS64_ (bs64Public) {
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcTokenKeyBS64_::bs64Public=<',bs64Public,'>');
    }
    const hashPublic = CryptoJS.SHA3(bs64Public, { outputLength: 512 }).toString(CryptoJS.enc.Base64);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcTokenKeyBS64_::hashPublic=<',hashPublic,'>');
    }
    const ripemdPublic = CryptoJS.RIPEMD160(hashPublic).toString(CryptoJS.enc.Base64);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcTokenKeyBS64_::ripemdPublic=<',ripemdPublic,'>');
    }
    const ripeBuffer = nacl.util.decodeBase64(ripemdPublic);
    const tokenKey = Base58.encode(ripeBuffer);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcTokenKeyBS64_::tokenKey=<',tokenKey,'>');
    }
    return tokenKey;
  }

  calcAddress_(b64Pub) {
    const binPub = nacl.util.decodeBase64(b64Pub);
    return this.calcAddressBin_(binPub);
  }
  
  calcAddressBin_(binPub) {
    const hash512 = nacl.hash(binPub);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcAddressBin_:hash512=<',Buffer.from(hash512).toString('hex'),'>');
    }
    const hash512B64 = Buffer.from(hash512).toString('base64');
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcAddressBin_:hash512B64=<',hash512B64,'>');
    }
    const hash1Pub = CryptoJS.SHA1(hash512B64).toString(CryptoJS.enc.Base64);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcAddressBin_:hash1Pub=<',hash1Pub,'>');
    }
    const hash1pubBuffer = nacl.util.decodeBase64(hash1Pub);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcAddressBin_:hash1pubBuffer=<',hash1pubBuffer,'>');
    }
    const sha1Buffer = Buffer.from(hash1pubBuffer);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcAddressBin_:sha1Buffer=<',sha1Buffer.toString('hex'),'>');
    }
    const address = base32.encode(sha1Buffer);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcAddressBin_:address=<',address,'>');
    }
    return address.toLowerCase();
  }
  
  randomAddress() {
    const randomHex = nacl.randomBytes(1024);
    if(MaapAuth.debug) {
      console.log('MaapAuth::randomAddress:randomHex=<',randomHex,'>');
    }
    return this.calcAddressBin_(randomHex);
  }
  calcId(msg) {
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcId:msg=<',msg,'>');
    }
    const msgBin = Buffer.from(msg,'utf-8')
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcId:msgBin=<',msgBin,'>');
    }
    const hash512 = nacl.hash(msgBin);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcId:hash512=<',Buffer.from(hash512).toString('hex'),'>');
    }
    const hash512B64 = Buffer.from(hash512).toString('base64');
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcId:hash512B64=<',hash512B64,'>');
    }
    const hash1Msg = CryptoJS.SHA1(hash512B64).toString(CryptoJS.enc.Base64);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcId:hash1Msg=<',hash1Msg,'>');
    }
    const hash1Buffer = nacl.util.decodeBase64(hash1Msg);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcId:hash1Buffer=<',hash1Buffer,'>');
    }
    const sha1Buffer = Buffer.from(hash1Buffer);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcId:sha1Buffer=<',sha1Buffer.toString('hex'),'>');
    }
    const address = base32.encode(sha1Buffer);
    if(MaapAuth.debug) {
      console.log('MaapAuth::calcId:address=<',address,'>');
    }
    return address.toLowerCase();
  }
  loadKey_() {
    try {
      if (fs.existsSync(this.keyPath_)) {
        const textKeyMaster = fs.readFileSync(this.keyPath_, 'utf8');
        if(MaapAuth.debug) {
          console.log('MaapAuth::loadKey_:textKeyMaster=<',textKeyMaster,'>');
        }
        const jsonKeyMaster = JSON.parse(textKeyMaster);        
        if(MaapAuth.debug) {
          console.log('MaapAuth::loadKey_:jsonKeyMaster=<',jsonKeyMaster,'>');
        }
        this.address_ = jsonKeyMaster.address;
        this.pubB64_ = jsonKeyMaster.publicKey;
        this.pubBin_ = nacl.util.decodeBase64(jsonKeyMaster.secretKey);
        this.secB64_ = jsonKeyMaster.secretKey;
        this.secBin_ = nacl.util.decodeBase64(jsonKeyMaster.secretKey);
      } else {
        this.createKey_();
        this.loadKey_();
      }
    } catch(err) {
      console.log('MaapAuth::loadKey_:err=<',err,'>');
    }
  }
  createKey_() {
    const keyPair = this.miningKey_();
    if(MaapAuth.debug) {
      console.log('MaapAuth::createKey_:keyPair=<',keyPair,'>');
    }
    const keySave  = {
      address: keyPair.address,
      publicKey: nacl.util.encodeBase64(keyPair.publicKey),
      secretKey: nacl.util.encodeBase64(keyPair.secretKey),
    }
    if(MaapAuth.debug) {
      console.log('MaapAuth::createKey_:keySave=<',keySave,'>');
    }
    fs.writeFileSync(this.keyPath_, JSON.stringify(keySave,undefined,2));
  }
  miningKey_() {
    while (true) {
      const keyPair = nacl.sign.keyPair();
      if(MaapAuth.debug) {
        console.log('MaapAuth::miningKey_:keyPair=<',keyPair,'>');
      }
      const address = this.calcAddressBin_(keyPair.publicKey);
      if(MaapAuth.debug) {
        console.log('MaapAuth::miningKey_:address=<',address,'>');
      }
      if(address.startsWith('mp')) {
        keyPair.address = address;
        return keyPair;
      }
    }
  }
}
module.exports = MaapAuth;
