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
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 3000,
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
    onMQTTMsg_.onMQTTMsg_(channel,msg);
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
  static debug = false;
  static readyState = false;
  constructor(cb) {
    this.cb_ = cb;
    console.log('Graviton::constructor::mqttApp=<',mqttApp,'>');
  }
  static onMQTTMsg_(channel,msg) {
    console.log('Graviton::onMQTTMsg_::channel=<',channel,'>');
    console.log('Graviton::onMQTTMsg_::msg=<',msg,'>');
  }
}
module.exports = Graviton;
