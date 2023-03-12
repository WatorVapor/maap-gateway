const Graviton = require('./graviton.js').Graviton;
const docDid_ = require('./document.js');
const DIDSeedDocument = docDid_.DIDSeedDocument;
const DIDLinkedDocument = docDid_.DIDLinkedDocument;
const DIDGuestDocument = docDid_.DIDGuestDocument;
const Level = require('level').Level;
const strConst = require('./const.js');
const { execSync } = require('child_process');
const nacl = require('tweetnacl');
//console.log('::::nacl=<',nacl,'>');
nacl.util = require('tweetnacl-util');
const CryptoJS = require('crypto-js');
const base32 = require('base32.js');


const cfConstLevelOption = {
  createIfMissing: true,
  keyEncoding: 'utf8',
  valueEncoding: 'utf8',
};

class Evidence {
  static trace = false;
  static debug = true;
  static did_method = 'maap';
  static did_resolve = 'wss://wator.xyz:8084/jwt/did';
  constructor(docJson,srcEvidence) {
    this.coc_ = {};
    if(Evidence.debug) {
      console.log('Evidence::constructor:docJson=<',docJson,'>');
    }
    if(srcEvidence) {
      return;
    }
    if(docJson) {
      if(docJson._maap_guest) {
        this.joinDid(docJson);
      } else {
        this.createFromJson_(docJson);
      }
    } else {
      this.createSeed_();
    }
  }
  async load() {
    await this.didDoc.load();
    if(Evidence.trace) {
      console.log('Evidence::load:this.didDoc=<',this.didDoc,'>');
    }
    this.addressCoc_ = this.calcBlockAddress_();
  }
  address(){
    if(this.didDoc) {
      return this.didDoc.address();
    }
    return `did:${Evidence.did_method}:`;
  }
  document() {
    if(Evidence.trace) {
      console.log('Evidence::document:this.didDoc=<',this.didDoc,'>');
    }
    if(this.didDoc) {
      return this.didDoc.document();
    }
    return {};
  }
  fissionRemote(newEvidence) {
    return this.createFromParentRemote_(newEvidence);
  }
  fissionLocal(newEvidence) {
    return this.createFromParentLocal_(newEvidence);
  }
  mass(){
    return this.didDoc.massAuth_;
  }
  
  createFromJson_(docJson,cb) {
    if(Evidence.trace) {
      console.log('Evidence::createFromJson_:docJson=<',docJson,'>');
    }
    this.coc_.parent = docJson.parent;
    this.coc_.stage = docJson.stage;
    this.didDoc = new DIDLinkedDocument(docJson.didDoc,cb);
  }
  createFromParentRemote_(newEvidence) {
    if(Evidence.trace) {
      console.log('Evidence::createFromParentRemote_:newEvidence=<',newEvidence,'>');
    }
    const evidence = new Evidence(null,null,this);
    evidence.coc_.parent = this.calcBlockAddress_();
    evidence.coc_.stage = 'stable';
    evidence.didDoc = this.didDoc;
    const keyId = this.calcAddress_(newEvidence.auth.pub);
    evidence.coc_.didDoc = this.didDoc.appendDocument(keyId,newEvidence.auth.pub);
    return evidence;
  }
  createFromParentLocal_(newEvidence) {
    if(Evidence.debug) {
      console.log('Evidence::createFromParentLocal_:newEvidence=<',newEvidence,'>');
    }
    const evidence = new Evidence(null,null,this);
    evidence.coc_.parent = this.calcBlockAddress_();
    evidence.coc_.stage = 'stable';
    evidence.didDoc = this.didDoc;
    evidence.coc_.didDoc = newEvidence.coc_.didDoc;
    return evidence;
  }

  createSeed_(cb) {
    this.coc_.parent = null;
    this.coc_.stage = 'stable';
    this.didDoc = new DIDSeedDocument(cb);
  }
  joinDid(docJson) {
    if(Evidence.debug) {
      console.log('Evidence::joinDid:docJson=<',docJson,'>');
    }
    this.coc_.parent = null;
    this.coc_.stage = 'guest';
    this.didDoc = new DIDGuestDocument(docJson.id);
    this.addressCoc_ = this.calcBlockAddress_();
  }
  calcAddress(msg) {
    const address = this.didDoc.massAuth_.calcAddress(msg);
    if(Evidence.trace) {
      console.log('Evidence::calcBlockAddress_:address=<',address,'>');
    }
    return address
  }


  calcBlockAddress_() {
    const address = this.didDoc.massAuth_.calcAddress(this.coc_);
    if(Evidence.trace) {
      console.log('Evidence::calcBlockAddress_:address=<',address,'>');
    }
    return address
  }


}

class ChainOfEvidence {
  static trace = false;
  static debug = true;
  static chainPrefix = 'didteam/cov';
  static chainStore_ = false;
  constructor(cb) {
    this.topEvidence_ = false;
    this.cb_ = cb;
    this.allBlocks_ = [];
    this.mapBlocks_ = {};
    try {
      if(!ChainOfEvidence.chainStore_)
      ChainOfEvidence.chainStore_ = new Level('.maap_store_evidence_chain', cfConstLevelOption);
    } catch(err) {
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::constructor:err=<',err,'>');
      }
    }
  }
  async load() {
    await this.loadEvidence_();
  }
  destroy() {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::destroy:ChainOfEvidence.chainStore_.status=<',ChainOfEvidence.chainStore_.status,'>');
    }
    ChainOfEvidence.chainStore_.close();
  }
  address() {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::address:this.topEvidence_=<',this.topEvidence_,'>');
    }
    if(this.topEvidence_) {
      return this.topEvidence_.address();
    }
    return `did:${Evidence.did_method}:`;
  }
  document() {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::address:this.topEvidence_=<',this.topEvidence_,'>');
    }
    if(this.topEvidence_) {
      return this.topEvidence_.document();
    }
    return {};
  }
  async createSeed() {
    this.topEvidence_ = new Evidence(null);
    await this.topEvidence_.load();
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::createSeed:this.topEvidence_=<',this.topEvidence_.coc_,'>');
    }
    this.topEvidence_.coc_.didDoc = this.topEvidence_.document();
    await ChainOfEvidence.chainStore_.put(strConst.DIDTeamAuthEvidenceTop,JSON.stringify(this.topEvidence_.coc_));
    this.saveEvidencesToChain_(this.topEvidence_);
  }
  
  async joinDid(id) {
    const guestEviJson = {id:id,_maap_guest:true};
    this.topEvidence_ = new Evidence(guestEviJson);
    await this.topEvidence_.load();
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::joinDid:this.topEvidence_=<',this.topEvidence_,'>');
    }
    this.topEvidence_.coc_.didDoc = this.topEvidence_.document();
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::joinDid:this.topEvidence_.coc_=<',this.topEvidence_.coc_,'>');
    }
    await ChainOfEvidence.chainStore_.put(strConst.DIDTeamAuthEvidenceTop,JSON.stringify(this.topEvidence_.coc_));
  }
  
  
  
  isMember() {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::isMember:this.topEvidence_=<',this.topEvidence_,'>');
    }
    if(this.topEvidence_.coc_.stage === 'stable') {
      return true;
    }
    return false;
  }
  reqJoinTeam(passcode) {
    if(ChainOfEvidence.trace) {
      console.log('ChainOfEvidence::reqJoinTeam:this.topEvidence_=<',this.topEvidence_,'>');
    }
    if(this.isMember()) {
      console.log('ChainOfEvidence::reqJoinTeam:this.isMember()=<',this.isMember(),'>');
      return;
    }
    if(!this.graviton_ ) {
      console.log('ChainOfEvidence::reqJoinTeam:this.graviton_=<',this.graviton_,'>');
      return;      
    }
    if(ChainOfEvidence.trace) {
      console.log('ChainOfEvidence::reqJoinTeam:this.graviton_=<',this.graviton_,'>');
    }
    const topic = `${this.topEvidence_.address()}/invited/req/join/team`
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::reqJoinTeam:topic=<',topic,'>');
    }
    const msg = {
      evidence:this.topEvidence_,
      passcode:passcode,
    };
    this.graviton_.publish(topic,msg);
  }

  syncTopBlock() {
    if(ChainOfEvidence.trace) {
      console.log('ChainOfEvidence::syncTopBlock:this.topEvidence_=<',this.topEvidence_,'>');
    }
    if(!this.graviton_ ) {
      console.log('ChainOfEvidence::syncTopBlock:this.graviton_=<',this.graviton_,'>');
      return;      
    }
    if(ChainOfEvidence.trace) {
      console.log('ChainOfEvidence::syncTopBlock:this.graviton_=<',this.graviton_,'>');
    }
    const topic = `${this.topEvidence_.address()}/cov/sync/top`;
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::syncTopBlock:topic=<',topic,'>');
    }
    const msg = {
      evidence:this.topEvidence_,
    };
    this.graviton_.publish(topic,msg);
  }
  
  syncStackedBlock(blockAddress) {
    if(!this.graviton_ ) {
      console.log('ChainOfEvidence::syncStackedBlock:this.graviton_=<',this.graviton_,'>');
      return;      
    }
    if(ChainOfEvidence.trace) {
      console.log('ChainOfEvidence::syncStackedBlock:this.graviton_=<',this.graviton_,'>');
    }
    const topic = `${this.topEvidence_.address()}/cov/req/stacked`;
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::syncStackedBlock:topic=<',topic,'>');
    }
    const msg = {
      request:{
        address:blockAddress
      }
    };
    this.graviton_.publish(topic,msg);
  }  
  

  async allowJoinTeam(reqMsg) {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::allowJoinTeam:reqMsg=<',reqMsg,'>');
    }
    const newTop = this.topEvidence_.fissionRemote(reqMsg);
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::allowJoinTeam:newTop=<',newTop,'>');
    }
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::allowJoinTeam:this.topEvidence_=<',this.topEvidence_,'>');
    }
    localStorage.setItem(constDIDTeamAuthEvidenceTop,JSON.stringify(newTop.coc_));
    await this.saveEvidencesToChain_(this.topEvidence_);
    this.topEvidence_ = newTop;
    const topic = `${newTop.address()}/invited/reply/join/team`
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::allowJoinTeam:topic=<',topic,'>');
    }
    this.pull2Root_(newTop.coc_,(evidences)=>{
      const msg = {
        top:newTop.coc_,
        evidences:evidences,
      };
      this.graviton_.publish(topic,msg);      
      /*
      setTimeout(()=>{
        location.reload();
      },1)
      */
    });
  }
  denyJoinTeam(reqMsg) {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::denyJoinTeam:reqMsg=<',reqMsg,'>');
    }
    const topic = `${this.topEvidence_.address()}/invited/reply/join/team`
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::denyJoinTeam:topic=<',topic,'>');
    }
    const msg = {
      deny:true,
    };
    this.graviton_.publish(topic,msg);
  }
  
  async loadEvidence_() {
    await ChainOfEvidence.chainStore_.open();
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::loadEvidence_:ChainOfEvidence.chainStore_.status=<',ChainOfEvidence.chainStore_.status,'>');
    }
    try {
      const topEviStr = await ChainOfEvidence.chainStore_.get(strConst.DIDTeamAuthEvidenceTop);
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::loadEvidence_:topEviStr=<',topEviStr,'>');
      }
      if(topEviStr) {
        const topEviJson = JSON.parse(topEviStr);
        if(ChainOfEvidence.debug) {
          console.log('ChainOfEvidence::loadEvidence_:topEviJson=<',topEviJson,'>');
        }
        if(topEviJson) {
          this.topEvidence_ = new Evidence(topEviJson);
          await this.topEvidence_.load();
        
          this.topEvidence_.coc_.didDoc = this.topEvidence_.document();
          this.topAdressCoc = this.topEvidence_.calcBlockAddress_();
          await this.pull2Root_(this.topEvidence_.coc_);
          await this.verifyTopEvidence_();
          await this.createConnection_(this.topEvidence_);
          
          for(const block of this.allBlocks_) {
            const address = this.topEvidence_.calcAddress(block);
            if(ChainOfEvidence.debug) {
              console.log('ChainOfEvidence::loadEvidence_::block:=<',block,'>');
              console.log('ChainOfEvidence::loadEvidence_::address:=<',address,'>');
              this.mapBlocks_[address] = block;
            }
          }
        }
      } else {
      }
    } catch (err) {
      console.log('ChainOfEvidence::loadEvidence_:err=<',err,'>');
    }
  }
  async verifyTopEvidence_(){
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::verifyTopEvidence_:this.topEvidence_=<',this.topEvidence_,'>');
    }
    if(ChainOfEvidence.debug) {
      const topCoc = this.topEvidence_.coc_;
      console.log('ChainOfEvidence::verifyTopEvidence_:topCoc=<',topCoc,'>');
    }
    const isComplete = this.topEvidence_.didDoc.isComplete()
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::verifyTopEvidence_:isComplete=<',isComplete,'>');
    }
    if(!isComplete) {
      const completeDoc = this.topEvidence_.didDoc.completeProof();
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::verifyTopEvidence_:completeDoc=<',completeDoc,'>');
      }
      const copyEvid = JSON.parse(JSON.stringify(this.topEvidence_));
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::verifyTopEvidence_:copyEvid=<',copyEvid,'>');
        console.log('ChainOfEvidence::verifyTopEvidence_:copyEvid.coc_=<',copyEvid.coc_,'>');
        console.log('ChainOfEvidence::verifyTopEvidence_:copyEvid.coc_.didDoc=<',copyEvid.coc_.didDoc,'>');
      }
      copyEvid.coc_.didDoc = JSON.parse(JSON.stringify(completeDoc));
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::verifyTopEvidence_:copyEvid.coc_=<',copyEvid.coc_,'>');
      }
      const newTop = this.topEvidence_.fissionLocal(copyEvid);
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::verifyTopEvidence_:newTop.coc_=<',newTop.coc_,'>');
        console.log('ChainOfEvidence::verifyTopEvidence_:newTop.coc_.didDoc=<',newTop.coc_.didDoc,'>');
      }
      await this.saveEvidencesToChain_(this.topEvidence_);
      await ChainOfEvidence.chainStore_.put(strConst.DIDTeamAuthEvidenceTop,JSON.stringify(newTop.coc_));
    }
  }
  async createConnection_(topEvid) {
    if(ChainOfEvidence.trace) {
      console.log('ChainOfEvidence::createConnection_:topEvid=<',topEvid,'>');
    }
    const evidences = [this.topEvidence_.document()];
    const self = this;
    const mass = this.topEvidence_.mass();
    this.graviton_ = new Graviton(evidences,mass,Evidence.did_resolve);
    await this.graviton_.load();
    this.graviton_.onMQTTMsg = (topic,jMsg) => {
      if(ChainOfEvidence.debug) {
        //console.log('ChainOfEvidence::onMQTTMsg:topic=<',topic,'>');
        //console.log('ChainOfEvidence::onMQTTMsg:jMsg=<',jMsg,'>');
      }      
      self.onMQTTMsg_(topic,jMsg);
    }
  }
  onMQTTMsg_(topic,jMsg) {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::onMQTTMsg_:topic=<',topic,'>');
      console.log('ChainOfEvidence::onMQTTMsg_:jMsg=<',jMsg,'>');
    }
    if(topic.endsWith('invited/req/join/team')) {
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::onMQTTMsg_:topic=<',topic,'>');
        console.log('ChainOfEvidence::onMQTTMsg_:this.onJoinReq=<',this.onJoinReq,'>');
      }
      if(typeof this.onJoinReq === 'function') {
        this.onJoinReq(jMsg);
      }
    } else if(topic.endsWith('invited/reply/join/team')){
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::onMQTTMsg_:topic=<',topic,'>');
        console.log('ChainOfEvidence::onMQTTMsg_:this.onJoinReply=<',this.onJoinReply,'>');
      }
      if(typeof this.onJoinReply === 'function') {
        this.onJoinReply(jMsg);
      }
      if(typeof this.onJoinReplyInternal_ === 'function') {
        this.onJoinReplyInternal_(jMsg);
      }
    } else if(topic.endsWith('cov/sync/stacked')){
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::onMQTTMsg_:topic=<',topic,'>');
        console.log('ChainOfEvidence::onMQTTMsg_:this.onSyncStackedInternal_=<',this.onSyncStackedInternal_,'>');
      }
      if(typeof this.onSyncStackedInternal_ === 'function') {
        this.onSyncStackedInternal_(jMsg.address,jMsg.block);
      }
    } else {
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::onMQTTMsg_:topic=<',topic,'>');
        console.log('ChainOfEvidence::onMQTTMsg_:jMsg=<',jMsg,'>');
      }      
    }
  }
  async saveEvidencesToChain_(evidence){
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::saveEvidencesToChain_:evidence=<',evidence,'>');
    }
    const chainAddress = evidence.calcBlockAddress_();
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::saveEvidencesToChain_:chainAddress=<',chainAddress,'>');
    }
    const chainPath = `${ChainOfEvidence.chainPrefix}/${chainAddress}`;
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::saveEvidencesToChain_:chainPath=<',chainPath,'>');
    }
    await ChainOfEvidence.chainStore_.put(chainPath,JSON.stringify(evidence.coc_));
  }
  async pull2Root_(topBlock,cb) {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::pull2Root_:topBlock=<',topBlock,'>');
    }
    this.allBlocks_ = [topBlock];
    await this.pull2RootInternl_(topBlock,cb);
  }
  async pull2RootInternl_(currBlock,cb) {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::pull2RootInternl_:currBlock=<',currBlock,'>');
    }
    if(currBlock.parent) {
      const chainPath = `${ChainOfEvidence.chainPrefix}/${currBlock.parent}`;
      if(ChainOfEvidence.debug) {
        console.log('ChainOfEvidence::pull2RootInternl_:chainPath=<',chainPath,'>');
      }
      try {
        const value = await ChainOfEvidence.chainStore_.get(chainPath);
        if(ChainOfEvidence.debug) {
          console.log('ChainOfEvidence::pull2RootInternl_:value=<',value,'>');
        }
        const valueJson = JSON.parse(value);
        if(ChainOfEvidence.debug) {
          console.log('ChainOfEvidence::pull2RootInternl_:valueJson=<',valueJson,'>');
        }
        if(valueJson) {
          this.allBlocks_.push(valueJson);
          if(valueJson.parent) {
            await this.pull2RootInternl_(valueJson);
          } else {
          }
        } else {
        }
      } catch(err) {
        console.log('ChainOfEvidence::pull2RootInternl_:err=<',err,'>');        
      }
    }
  }  
  
  async onJoinReplyInternal_(jMsg) {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::onJoinReplyInternal_:jMsg=<',jMsg,'>');
      console.log('ChainOfEvidence::onJoinReplyInternal_:jMsg.top=<',jMsg.top,'>');
      console.log('ChainOfEvidence::onJoinReplyInternal_:jMsg.top=<',JSON.stringify(jMsg.top,undefined,2),'>');
    }
    await ChainOfEvidence.chainStore_.put(strConst.DIDTeamAuthEvidenceTop,JSON.stringify(jMsg.top));
    await this.graviton_.clearJWT();
    process.exit(0);
  }
  async onSyncStackedInternal_(chainAddress,block) {
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::onSyncStackedInternal_:chainAddress=<',chainAddress,'>');
      console.log('ChainOfEvidence::onSyncStackedInternal_:block=<',block,'>');
    }    
    const chainPath = `${ChainOfEvidence.chainPrefix}/${chainAddress}`;
    if(ChainOfEvidence.debug) {
      console.log('ChainOfEvidence::saveEvidencesToChain_:chainPath=<',chainPath,'>');
    }
    await ChainOfEvidence.chainStore_.put(chainPath,JSON.stringify(block));
  }
}

module.exports = {
  ChainOfEvidence:ChainOfEvidence,
  Evidence:Evidence,
}
