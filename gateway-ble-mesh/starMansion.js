const fs = require('fs');
class StarMassion {
  static debug = false;
  constructor() {
    this.starMansionPath_ = './config/starMansion.json';
    this.loadMassion_();
  }
  loadMassion_() {
    try {
      if (fs.existsSync(this.starMansionPath_)) {
        const textMassion = fs.readFileSync(this.starMansionPath_, 'utf8');
        //console.log('StarMassion::loadMassion_:textMassion=<',textMassion,'>');
        const jsonMassion = JSON.parse(textMassion);
        //console.log('StarMassion::loadMassion_:jsonMassion=<',jsonMassion,'>');
        this.authed = jsonMassion.authed;
      } else {
      }
    } catch(err) {
      console.log('StarMassion::loadMassion_:err=<',err,'>');
    }
  }
}
module.exports = StarMassion;
