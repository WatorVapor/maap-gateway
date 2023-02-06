import {MassStore} from './mass-store.js';
export class GravitonJWT {
  static trace = false;
  static debug = true;
  constructor(evidences,mass,resolve,cb) {
    if(GravitonJWT.trace) {
      console.log('GravitonJWT::constructor:evidences=<',evidences,'>');
    }
    this.evidences_ = evidences;
    this.mqttJwt_ = resolve;
    this.mass_ = mass;
    this.cb_ = cb;
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
    if(GravitonJWT.debug) {
      console.log('GravitonJWT::wsClient=<',wsClient,'>');
    }
    const self = this;
    wsClient.onopen = (evt)=> {
      if(GravitonJWT.debug) {
        console.log('GravitonJWT::createMqttAuthOfJwtConnection_::onopen:evt=<',evt,'>');
      }
      setTimeout(()=>{
        self.onMqttJwtChannelOpened_(wsClient);
      },100)
    }
    wsClient.onclose = (evt)=> {
      if(GravitonJWT.debug) {
        console.log('GravitonJWT::createMqttAuthOfJwtConnection_::onclose:evt=<',evt,'>');
      }
    }
    wsClient.onerror = (err)=> {
      console.error('GravitonJWT::createMqttAuthOfJwtConnection_::onerror:err=<',err,'>');
    }
    wsClient.onmessage = (evt)=> {
      if(GravitonJWT.debug) {
        console.log('GravitonJWT::createMqttAuthOfJwtConnection_::onmessage:evt=<',evt,'>');
      }
      try {
        const msg = JSON.parse(evt.data);
        if(GravitonJWT.debug) {
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
    if(GravitonJWT.debug) {
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
    if(GravitonJWT.debug) {
      console.log('onMqttJwtChannelOpened_::signedJwtReq=<',signedJwtReq,'>');
    }
    wsClient.send(JSON.stringify(signedJwtReq));
  }
  onMqttJwtReply_(jwt,payload,origData) {
    if(GravitonJWT.debug) {
      console.log('onMqttJwtReply_::jwt=<',jwt,'>');
      console.log('onMqttJwtReply_::payload=<',payload,'>');
    }
    if(payload.keyid) {
      const jwtLSKey = `${constDIDTeamAuthGravitonJwtPrefix}/${payload.keyid}`;
      localStorage.setItem(jwtLSKey,origData);
    }
    if(typeof this.cb_ === 'function') {
      this.cb_();
    }
  }
}

