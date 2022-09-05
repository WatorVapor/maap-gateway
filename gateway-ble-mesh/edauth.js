const nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');
const CryptoJS = require('crypto-js');
const base32  = require('base32.js');
const fs = require('fs');
class EDAuth {
  static debug = true;
  constructor() {
    this.keyPath_ = './keyMaster.json';
    this.loadKey_();
  }
  sign(msgOrig) {
    msgOrig.ts = new Date().toISOString();
    const msgOrigStr = JSON.stringify(msgOrig);
    const encoder = new TextEncoder();
    const hash = nacl.hash(encoder.encode(msgOrigStr));
    if(EDAuth.debug) {
      console.log('EDAuth::sign::hash=<',hash,'>');
    }
    const hash512B64 = nacl.util.encodeBase64(hash);
    if(EDAuth.debug) {
      console.log('EDAuth::sign::hash512B64=<',hash512B64,'>');
    }
    const sha1MsgB64 = CryptoJS.SHA1(hash512B64).toString(CryptoJS.enc.Base64);
    if(EDAuth.debug) {
      console.log('EDAuth::sign::sha1MsgB64=<',sha1MsgB64,'>');
    }
    const sha1MsgBin = nacl.util.decodeBase64(sha1MsgB64);;
    const signed = nacl.sign(sha1MsgBin,this.secBin_);
    if(EDAuth.debug) {
      console.log('EDAuth::sign::signed=<',signed,'>');
    }
    const signedB64 = nacl.util.encodeBase64(signed);
    const signMsgObj = JSON.parse(msgOrigStr);
    signMsgObj.auth = {};
    signMsgObj.auth.pub = this.pubB64_;
    signMsgObj.auth.sign = signedB64;
    return signMsgObj;
  }
  verify(msg) {
    console.log('EDAuth::verify::msg=<',msg,'>');
    const created_at = new Date(msg.ts);
    const now = new Date();
    const escape_ms = now - created_at;
    //console.log('EDAuth::verify::escape_ms=<',escape_ms,'>');
    if(escape_ms > 1000*5) {
      console.log('EDAuth::verify::escape_ms=<',escape_ms,'>');
      return false;
    } 
    const calcAddress = this.calcAddress_(msg.auth.pub);
    //console.log('EDAuth::verify::calcAddress=<',calcAddress,'>');
    if(!calcAddress.startsWith('mp')) {
      console.log('EDAuth::verify::calcAddress=<',calcAddress,'>');
      return false;
    }
    const publicKey = nacl.util.decodeBase64(msg.auth.pub);
    const signMsg = nacl.util.decodeBase64(msg.auth.sign);
    //console.log('EDAuth::verify::publicKey=<',publicKey,'>');
    //console.log('EDAuth::verify::signMsg=<',signMsg,'>');
    const signedHash = nacl.sign.open(signMsg,publicKey);
    if(!signedHash) {
      console.log('EDAuth::verify::signedHash=<',signedHash,'>');
      return false;
    }
    const signedHashB64 = nacl.util.encodeBase64(signedHash);
    //console.log('EDAuth::verify::signedHashB64=<',signedHashB64,'>');
    
    const msgCal = Object.assign({},msg);
    delete msgCal.auth;
    const msgCalcStr = JSON.stringify(msgCal);
    const encoder = new TextEncoder();
    const hashCalc = nacl.hash(encoder.encode(msgCalcStr));
    //console.log('EDAuth::verify::hashCalc=<',hashCalc,'>');
    const hashCalc512B64 = nacl.util.encodeBase64(hashCalc);
    //console.log('EDAuth::verify::hashCalc512B64=<',hashCalc512B64,'>');
    const hashCalclB64 = CryptoJS.SHA1(hashCalc512B64).toString(CryptoJS.enc.Base64);   
    if(signedHashB64 === hashCalclB64) {
      msg.auth_address = calcAddress;
      return true;
    } else {
      console.log('EDAuth::verify::signedHashB64=<',signedHashB64,'>');
      console.log('EDAuth::verify::hashCalclB64=<',hashCalclB64,'>');
    }
    return false;
  }
  calcTokenKeyBS64_ (bs64Public) {
    //console.log('EDAuth::calcTokenKeyBS64_::bs64Public=<',bs64Public,'>');
    const hashPublic = CryptoJS.SHA3(bs64Public, { outputLength: 512 }).toString(CryptoJS.enc.Base64);
    //console.log('EDAuth::calcTokenKeyBS64_::hashPublic=<',hashPublic,'>');
    const ripemdPublic = CryptoJS.RIPEMD160(hashPublic).toString(CryptoJS.enc.Base64);
    //console.log('EDAuth::calcTokenKeyBS64_::ripemdPublic=<',ripemdPublic,'>');
    const ripeBuffer = nacl.util.decodeBase64(ripemdPublic);
    const tokenKey = Base58.encode(ripeBuffer);
    //console.log('EDAuth::calcTokenKeyBS64_::tokenKey=<',tokenKey,'>');
    return tokenKey;
  }

  calcAddress_(b64Pub) {
    const binPub = nacl.util.decodeBase64(b64Pub);
    return this.calcAddressBin_(binPub);
  }
  
  calcAddressBin_(binPub) {
    const hash512 = nacl.hash(binPub);
    //console.log('EDAuth::calcAddressBin_:hash512=<',Buffer.from(hash512).toString('hex'),'>');
    const hash512B64 = Buffer.from(hash512).toString('base64');
    //console.log('EDAuth::calcAddressBin_:hash512B64=<',hash512B64,'>');
    const hash1Pub = CryptoJS.SHA1(hash512B64).toString(CryptoJS.enc.Base64);
    //console.log('EDAuth::calcAddressBin_:hash1Pub=<',hash1Pub,'>');
    const hash1pubBuffer = nacl.util.decodeBase64(hash1Pub);
    //console.log('EDAuth::calcAddressBin_:hash1pubBuffer=<',hash1pubBuffer,'>');
    const sha1Buffer = Buffer.from(hash1pubBuffer);
    //console.log('EDAuth::calcAddressBin_:sha1Buffer=<',sha1Buffer.toString('hex'),'>');
    const address = base32.encode(sha1Buffer);
    //console.log('EDAuth::calcAddressBin_:address=<',address,'>');
    return address.toLowerCase();
  }
  
  randomAddress() {
    const randomHex = nacl.randomBytes(1024);
    console.log('EDAuth::randomAddress:randomHex=<',randomHex,'>');
    return this.calcAddressBin_(randomHex);
  }
  calcId(msg) {
    //console.log('EDAuth::calcId:msg=<',msg,'>');
    const msgBin = Buffer.from(msg,'utf-8')
    //console.log('EDAuth::calcId:msgBin=<',msgBin,'>');
    const hash512 = nacl.hash(msgBin);
    //console.log('EDAuth::calcId:hash512=<',Buffer.from(hash512).toString('hex'),'>');
    const hash512B64 = Buffer.from(hash512).toString('base64');
    //console.log('EDAuth::calcId:hash512B64=<',hash512B64,'>');
    const hash1Msg = CryptoJS.SHA1(hash512B64).toString(CryptoJS.enc.Base64);
    //console.log('EDAuth::calcId:hash1Msg=<',hash1Msg,'>');
    const hash1Buffer = nacl.util.decodeBase64(hash1Msg);
    //console.log('EDAuth::calcId:hash1Buffer=<',hash1Buffer,'>');
    const sha1Buffer = Buffer.from(hash1Buffer);
    //console.log('EDAuth::calcId:sha1Buffer=<',sha1Buffer.toString('hex'),'>');
    const address = base32.encode(sha1Buffer);
    //console.log('EDAuth::calcId:address=<',address,'>');
    return address.toLowerCase();
  }
  loadKey_() {
    try {
      if (fs.existsSync(this.keyPath_)) {
        const textKeyMaster = fs.readFileSync(this.keyPath_, 'utf8');
        //console.log('EDAuth::loadKey_:textKeyMaster=<',textKeyMaster,'>');
        const jsonKeyMaster = JSON.parse(textKeyMaster);        
        //console.log('EDAuth::loadKey_:jsonKeyMaster=<',jsonKeyMaster,'>');
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
      console.log('EDAuth::loadKey_:err=<',err,'>');
    }
  }
  createKey_() {
    const keyPair = this.miningKey_();
    console.log('EDAuth::createKey_:keyPair=<',keyPair,'>');
    const keySave  = {
      address: keyPair.address,
      publicKey: nacl.util.encodeBase64(keyPair.publicKey),
      secretKey: nacl.util.encodeBase64(keyPair.secretKey),
    }
    console.log('EDAuth::createKey_:keySave=<',keySave,'>');
    fs.writeFileSync(this.keyPath_, JSON.stringify(keySave,undefined,2));
  }
  miningKey_() {
    while (true) {
      const keyPair = nacl.sign.keyPair();
      //console.log('EDAuth::miningKey_:keyPair=<',keyPair,'>');
      const address = this.calcAddressBin_(keyPair.publicKey);
      //console.log('EDAuth::miningKey_:address=<',address,'>');
      if(address.startsWith('mp')) {
        keyPair.address = address;
        return keyPair;
      }
    }
  }
}
module.exports = EDAuth;
