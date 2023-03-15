const redis = require('redis');
const localChannelConifg = {
  socket:{
    path: '/dev/shm/maap.gateway.redis.sock',
    connectTimeout:1000
  }
};

class MaapLocalProxy {
  constructor (outPrefix,inPattern,cb) {
    this.trace_ = false;
    this.debug_ = true;

    this.out_ = outPrefix;
    this.in_ = inPattern;
    this.cb = cb;
    this.createRedis_();
  }
  createRedis_() {
    const self = this;
    const subClient = redis.createClient(localChannelConifg);
    subClient.on('ready',()=>{
      if(this.debug_) {
        console.log('MaapLocalProxy::createRedis_::ready:subClient=<',subClient,'>');
      }
      self.createSubscribes_(subClient);
    });
    subClient.on('connect',()=>{
      if(this.trace_) {
        console.log('MaapLocalProxy::createRedis_::connect:subClient=<',subClient,'>');
      }
    });
    subClient.on('error',()=>{
      console.log('MaapLocalProxy::createRedis_::error:subClient=<',subClient,'>');
    });
    subClient.on('end',()=>{
      console.log('MaapLocalProxy::createRedis_::end:subClient=<',subClient,'>');
    });
    subClient.on('reconnecting',()=>{
      if(this.trace_) {
        console.log('MaapLocalProxy::createRedis_::reconnecting:subClient=<',subClient,'>');
      }
    });    
    subClient.connect();

    this.pubClient_ = redis.createClient(localChannelConifg);
    if(this.trace_) {
      console.log('MaapLocalProxy::createRedis_::createRedis_:this.pubClient_=<',this.pubClient_,'>');
    }
    this.pubClient_.on('ready',()=>{
      if(this.trace_) {
        console.log('MaapLocalProxy::createRedis_::ready:this.pubClient_=<',this.pubClient_,'>');
      }
    });
    this.pubClient_.on('connect',()=>{
      if(this.trace_) {
        console.log('MaapLocalProxy::createRedis_::connect:this.pubClient_=<',this.pubClient_,'>');
      }
    });
    this.pubClient_.on('error',()=>{
      console.log('MaapLocalProxy::createRedis_::error:this.pubClient_=<',this.pubClient_,'>');
    });
    this.pubClient_.on('end',()=>{
      console.log('MaapLocalProxy::createRedis_::end:this.pubClient_=<',this.pubClient_,'>');
    });
    this.pubClient_.on('reconnecting',()=>{
      if(this.trace_) {
        console.log('MaapLocalProxy::createRedis_::reconnecting:this.pubClient_=<',this.pubClient_,'>');
      }
    });
    this.pubClient_.connect();
  }
  createSubscribes_(subClient) {
    if(typeof this.in_ === 'string') {
      subClient.pSubscribe(this.in_,(message, channel) => {
        if(this.debug_) {
          console.log('MaapLocalProxy::createSubscribes_::channel=<',channel,'>');
          console.log('MaapLocalProxy::createSubscribes_::message=<',message,'>');
        }
        this.cb(channel,message);
      });
    } else if(typeof this.in_ === 'object') {
      for(const topic of this.in_) {
        subClient.pSubscribe(topic,(message, channel) => {
          if(this.debug_) {
            console.log('MaapLocalProxy::createSubscribes_::channel=<',channel,'>');
            console.log('MaapLocalProxy::createSubscribes_::message=<',message,'>');
          }
          this.cb(channel,message);
        });        
      }     
    } else {
      if(this.debug_) {
        console.log('MaapLocalProxy::createSubscribes_::channel=<',channel,'>');
      }      
    }
  }

};

module.exports = MaapLocalProxy;
