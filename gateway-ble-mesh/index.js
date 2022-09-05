const mqtt = require('mqtt');
const WS = require('ws');
const EDAuth = require('./edauth.js');
const auth = new EDAuth();

const MqttJwt = {
  trace:false,
  debug:true,
};

const ws = new WS.WebSocket('wss://wator.xyz:8084/jwt');
ws.on('open', (evt) => {
  console.log('::::connected evt:=<',evt,'>');
  onMqttJwtChannelOpened_(ws);
});
ws.on('error', (evt) => {
  console.log('::::error evt:=<',evt,'>');
});
ws.on('close', (evt) => {
  console.log('::::close evt:=<',evt,'>');
});
ws.on('message', (data) => {
  console.log('::::message data:=<',data,'>');
});


const onMqttJwtChannelOpened_ = (wsClient) => {
  if(MqttJwt.trace) {
    console.log('onMqttJwtChannelOpened_::wsClient=<',wsClient,'>');
  }  
  const request = {
    jwt:{
      gate:true,
      username:'',
      clientid:'',
      address:'',
    }
  };
  if(MqttJwt.debug) {
    console.log('onMqttJwtChannelOpened_::request=<',request,'>');
  }
  const signedReq = auth.sign(request);
  if(MqttJwt.debug) {
    console.log('onMqttJwtChannelOpened_::signedReq=<',signedReq,'>');
  }
  wsClient.send(JSON.stringify(signedReq));
}


/*
const OPTIONS = {
  clientId:clientId,
  clean: true,
  connectTimeout: 4000,
  username: username,
  password: token,
  reconnectPeriod: 3000,
}

const connectUrl = `mqtts://wator.xyz:8883`;

const client = mqtt.connect(connectUrl, OPTIONS);
client.on('connect', () => {
  //console.log('connect::client:=<',client,'>');
  console.log('connect::client.connected:=<',client.connected,'>');
  doSub();
  setInterval(()=> {
    doPub();
  },1000)
});
client.on('reconnect', (error) => {
  console.log('reconnect::error:=<',error,'>');
  console.log('connect::client.connected:=<',client.connected,'>');
});
client.on('error', (error) => {
  console.log('error::error:=<',error,'>');
});

client.on('message', (channel,msg) => {
  //console.log('connect::client:=<',client,'>');
  onMessageSub(channel,msg);
});

const doSub = () => {
  client.subscribe(`/cloud/${username}/#`,{qos:1},(err, granted)=>{
    console.log('doSub::err:=<',err,'>');
    console.log('doSub::granted:=<',granted,'>');
  });
  client.subscribe(`/signal/${clientId}/#`,{qos:1},(err, granted)=>{
    console.log('doSub::err:=<',err,'>');
    console.log('doSub::granted:=<',granted,'>');
  });

  client.subscribe(`/cloud/other_test_jwt/#`,{qos:1},(err, granted)=>{
    console.log('doSub::err:=<',err,'>');
    console.log('doSub::granted:=<',granted,'>');
  });

};
const doPub = () => {
  const msg = `cloud_data_ ${new Date()}`;
  client.publish(`/cloud/${username}/date`,msg,{qos:1},(err)=>{
    console.log('doPub::err:=<',err,'>');
  });
  client.publish(`/cloud/other_test_jwt/date`,msg,{qos:1},(err)=>{
    console.log('doPub::err:=<',err,'>');
  });
  const msg2 = `signal_data_ ${new Date()}`;
  client.publish(`/signal/${clientId}/date`,msg2,{qos:1},(err)=>{
    console.log('doPub::err:=<',err,'>');
  });
}

const onMessageSub = (channel,msg) => {
  console.log('onMessageSub::channel:=<',channel,'>');
  console.log('onMessageSub::msg:=<',msg.toString('utf-8'),'>');
}
*/

