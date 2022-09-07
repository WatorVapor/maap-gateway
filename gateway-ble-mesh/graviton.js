const MqttJwt = {
  trace:false,
  debug:true,
};
const mqtt = require('mqtt');
const WS = require('ws');
const MaapAuth = require('./maapAuth.js');
const auth = new MaapAuth();
const StarMassion = require('./starMansion.js');
const massion = new StarMassion();
const JWT_URI = 'wss://wator.xyz:8084/jwt';
const MQTT_URI = `mqtts://wator.xyz:8883`;

const ws = new WS.WebSocket(JWT_URI);
ws.on('open', (evt) => {
  console.log('::::connected evt:=<',evt,'>');
  reqMqttJwt_(ws);
});
ws.on('error', (evt) => {
  console.log('::::error evt:=<',evt,'>');
});
ws.on('close', (evt) => {
  console.log('::::close evt:=<',evt,'>');
});
ws.on('message', (data) => {
  try {
    const jMsg = JSON.parse(data.toString('utf-8'));
    if(MqttJwt.trace) {
      console.log('::::message jMsg:=<',jMsg,'>');
    }
    if(jMsg.jwt && jMsg.payload) {
      onMqttJWTMsg_(jMsg.jwt,jMsg.payload);
    }
  } catch(err) {
    console.log('::::message data:=<',data.toString('utf-8'),'>');
  }
});


const reqMqttJwt_ = (wsClient) => {
  if(MqttJwt.trace) {
    console.log('reqMqttJwt_::wsClient=<',wsClient,'>');
  }  
  const request = {
    jwt:{
      gateway:true,
      username:massion.authed,
      clientid:auth.address_,
      address:auth.address_,
    }
  };
  if(MqttJwt.trace) {
    console.log('reqMqttJwt_::request=<',request,'>');
  }
  const signedReq = auth.sign(request);
  if(MqttJwt.trace) {
    console.log('reqMqttJwt_::signedReq=<',signedReq,'>');
  }
  wsClient.send(JSON.stringify(signedReq));
}

const mqttApp = {};

const onMqttJWTMsg_ = (jwt,payload) => {
  if(MqttJwt.debug) {
    console.log('onMqttJWTMsg_::jwt=<',jwt,'>');
    console.log('onMqttJWTMsg_::payload=<',payload,'>');
  }
  mqttApp.clientid = payload.clientid;
  mqttApp.username = payload.username;
  const options = {
    clientId:payload.clientid,
    username: payload.username,
    password: jwt,    
    protocolVersion:5,
    keepalive: 60*5,
    connectTimeout: 4000,
    clean: true,
    rejectUnauthorized: false
  }
  if(MqttJwt.debug) {
    console.log('onMqttJWTMsg_::options=<',options,'>');
  }
  const client = mqtt.connect(MQTT_URI, options);
  client.on('connect', () => {
    //console.log('connect::client:=<',client,'>');
    console.log('connect::client.connected:=<',client.connected,'>');
  });
  client.on('reconnect', (error) => {
    console.log('reconnect::error:=<',error,'>');
    console.log('connect::client.connected:=<',client.connected,'>');
  });
  client.on('error', (error) => {
    console.log('error::error:=<',error,'>');
    reqMqttJwt_(ws);
  });

  client.on('message', (channel,msg) => {
    //console.log('connect::client:=<',client,'>');
    Graviton.onMQTTMsg_(channel,msg);
  });
  client.subscribe(`${payload.username}/#`,{qos:1},(err, granted) => {
    console.log('Graviton::subscribe::err:=<',err,'>');
    console.log('Graviton::subscribe::granted:=<',granted,'>');
  });
  client.subscribe(`${payload.clientid}/#`,{qos:1},(err, granted) => {
    console.log('Graviton::subscribe::err:=<',err,'>');
    console.log('Graviton::subscribe::granted:=<',granted,'>');
    Graviton.readyState = true;
  });
  mqttApp.client = client;
}

class Graviton {
  static debug = true;
  static trace = false;
  static readyState = false;
  static cbs = [];
  constructor(cb) {
    this.cb_ = cb;
    Graviton.cbs.push(cb);
    this.checkMqttReady_();
  }
  
  
  static onMQTTMsg_(channel,msg) {
    if(Graviton.trace) {
      console.log('Graviton::onMQTTMsg_::channel=<',channel,'>');
      console.log('Graviton::onMQTTMsg_::msg=<',msg,'>');
      console.log('Graviton::onMQTTMsg_::Graviton.cbs=<',Graviton.cbs,'>');
    }
  }
  
  checkMqttReady_() {
    if(Graviton.readyState) {
      this.invokeAtMqttReady_();
    } else {
      const self = this; 
      setTimeout(()=>{
        self.checkMqttReady_();
      },1000);
    }
  }
  invokeAtMqttReady_() {
    if(Graviton.trace) {
      console.log('Graviton::invokeAtMqttReady_::mqttApp=<',mqttApp,'>');
    }
    const helloWorld = {
      clientid:mqttApp.clientid,
      username:mqttApp.username,
      address:auth.address_,
    }
    if(Graviton.debug) {
      console.log('Graviton::invokeAtMqttReady_::helloWorld=<',helloWorld,'>');
    }
    this.broadcast_('graviton/joined',helloWorld);
  }
  
  broadcast_(topic,msg) {
    const signedMsg = auth.sign(msg);
    if(Graviton.debug) {
      console.log('Graviton::broadcast_::signedMsg=<',signedMsg,'>');
    }
    const fullTopic = `${mqttApp.username}/${topic}`;
    if(Graviton.debug) {
      console.log('Graviton::broadcast_::fullTopic=<',fullTopic,'>');
    }
    mqttApp.client.publish(fullTopic,JSON.stringify(signedMsg),{qos:1},(err) => {
      if(Graviton.debug) {
        console.log('Graviton::broadcast_::err=<',err,'>');
      }      
    });
  }
  
}
module.exports = Graviton;
