const WebSocket = require('ws').WebSocket;
const Level = require('level').Level;
const MassStore = require('./mass-store.js').MassStore;
const strConst = require('./const.js');

const iConstOneHourInMs  = 1000 * 3600;

class GravitonJWT {
  static trace = true;
  static debug = true;
  
  static store_ = false;
  
  constructor(evidences,mass,resolve,cb) {
    if(GravitonJWT.trace) {
      console.log('GravitonJWT::constructor:evidences=<',evidences,'>');
    }
    this.evidences_ = evidences;
    this.mqttJwt_ = resolve;
    this.mass_ = mass;
    this.cb_ = cb;
    const config = {
      createIfMissing: true,
      valueEncoding: 'json',
    };
    if(!GravitonJWT.store_) {
      GravitonJWT.store_ = new Level('.maap_store_graviton', config);
    }
    this.checkLocalStorageOfMqttJwt_();
  }

  async checkLocalStorageOfMqttJwt_() {
    if(GravitonJWT.trace) {
      console.log('GravitonJWT::checkLocalStorageOfMqttJwt_:this.mass_=<',this.mass_,'>');
    }
    const jwtLSKey = `${strConst.DIDTeamAuthGravitonJwtPrefix}/${this.mass_.address_}`;
    if(GravitonJWT.trace) {
      console.log('GravitonJWT::checkLocalStorageOfMqttJwt_:jwtLSKey=<',jwtLSKey,'>');
    }
    await GravitonJWT.store_.open();
    if(GravitonJWT.trace) {
      console.log('GravitonJWT::checkLocalStorageOfMqttJwt_:GravitonJWT.store_.status=<',GravitonJWT.store_.status,'>');
    }
    try {
      const jwtStr = await GravitonJWT.store_.get(jwtLSKey);
      const jwt = JSON.parse(jwtStr);
      if(GravitonJWT.trace) {
        console.log('GravitonJWT::checkLocalStorageOfMqttJwt_:jwt=<',jwt,'>');
      }
      if(jwt.payload && jwt.payload.exp ) {
        const jwtExpDate = new Date();
        const timeInMs = parseInt(jwt.payload.exp) *1000;
        jwtExpDate.setTime(timeInMs);
        if(GravitonJWT.trace) {
          console.log('GravitonJWT::checkLocalStorageOfMqttJwt_:jwtExpDate=<',jwtExpDate,'>');
        }
        const exp_remain_ms = jwtExpDate - new Date();
        if(GravitonJWT.trace) {
          console.log('GravitonJWT::checkLocalStorageOfMqttJwt_:exp_remain_ms=<',exp_remain_ms,'>');
        }
        if(exp_remain_ms > iConstOneHourInMs) {
          this.cb_(jwt);
          return;
        }
      }
    } catch(err) {
      if(!err.notFound) {
        console.error('GravitonJWT::checkLocalStorageOfMqttJwt_:err=<',err,'>');
      }
    }
    this.reqMqttAuthOfJwt_();
  }
  
  reqMqttAuthOfJwt_() {
    if(GravitonJWT.trace) {  
      console.log('GravitonJWT::reqMqttAuthOfJwt_:this.evidences_=<',this.evidences_,'>');
    }
    this.createMqttAuthOfJwtConnection_();
  }
  createMqttAuthOfJwtConnection_() {
    if(GravitonJWT.trace) {
      console.log('GravitonJWT::createMqttAuthOfJwtConnection_:this.mqttJwt_=<',this.mqttJwt_,'>');
    }    
    const wsClient = new WebSocket(this.mqttJwt_);
    if(GravitonJWT.trace) {
      console.log('GravitonJWT::wsClient=<',wsClient,'>');
    }
    const self = this;
    wsClient.onopen = (evt)=> {
      if(GravitonJWT.trace) {
        console.log('GravitonJWT::createMqttAuthOfJwtConnection_::onopen:evt=<',evt,'>');
      }
      setTimeout(()=>{
        self.onMqttJwtChannelOpened_(wsClient);
      },100)
    }
    wsClient.onclose = (evt)=> {
      if(GravitonJWT.trace) {
        console.log('GravitonJWT::createMqttAuthOfJwtConnection_::onclose:evt=<',evt,'>');
      }
    }
    wsClient.onerror = (err)=> {
      console.error('GravitonJWT::createMqttAuthOfJwtConnection_::onerror:err=<',err,'>');
    }
    wsClient.onmessage = (evt)=> {
      if(GravitonJWT.trace) {
        console.log('GravitonJWT::createMqttAuthOfJwtConnection_::onmessage:evt=<',evt,'>');
      }
      try {
        const msg = JSON.parse(evt.data);
        if(GravitonJWT.trace) {
          console.log('GravitonJWT::createMqttAuthOfJwtConnection_::onmessage:msg=<',msg,'>');
        }
        if(msg.jwt && msg.payload) {
          self.onMqttJwtReply_(msg.jwt,msg.payload,evt.data);
        }
      } catch(err) {
        console.error('GravitonJWT::createMqttAuthOfJwtConnection_::onmessage:err=<',err,'>');
      }
    }

  }
  onMqttJwtChannelOpened_ (wsClient) {
    if(GravitonJWT.trace) {
      console.log('onMqttJwtChannelOpened_::wsClient=<',wsClient,'>');
      console.log('onMqttJwtChannelOpened_::this.evidences_=<',this.evidences_,'>');
      console.log('GravitonJWT::reqMqttAuthOfJwt_:this.mass_=<',this.mass_,'>');
    }
    const jwtReq = {
      jwt:{
        browser:true,
        address:this.mass_.address_,
      },
      evidences:this.evidences_
    }
    const signedJwtReq = this.mass_.sign(jwtReq);
    if(GravitonJWT.trace) {
      console.log('onMqttJwtChannelOpened_::signedJwtReq=<',signedJwtReq,'>');
    }
    wsClient.send(JSON.stringify(signedJwtReq));
  }
  async onMqttJwtReply_(jwt,payload,origData) {
    if(GravitonJWT.trace) {
      console.log('onMqttJwtReply_::jwt=<',jwt,'>');
      console.log('onMqttJwtReply_::payload=<',payload,'>');
    }
    if(payload.keyid) {
      const jwtLSKey = `${strConst.DIDTeamAuthGravitonJwtPrefix}/${payload.keyid}`;
      if(GravitonJWT.trace) {
        console.log('onMqttJwtReply_::jwtLSKey=<',jwtLSKey,'>');
      }
      try {
        await GravitonJWT.store_.put(jwtLSKey,origData);
      } catch(err) {
        console.error('GravitonJWT::onMqttJwtReply_:err=<',err,'>');
      }
      this.checkLocalStorageOfMqttJwt_();
    }
  }
}

module.exports = {
  GravitonJWT:GravitonJWT,
}
