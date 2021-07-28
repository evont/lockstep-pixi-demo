import { Player } from "./mgobe/MGOBE";
/**
 * 全局状态管理器
 */
class DataBus {
  constructor() {
    this.userInfo = {};

    this.reset();
  }

  reset() {
    this.gameover = false;
    this.bullets = [];
    this.playerMap = {};
    this.playerList = [];
    this.debugMsg = [];
    this.matchPattern = void 0;
    this.room = null;
    this.isSingle = false;
    this._userId = "";
  }

  get roomInfo() {
    return this.room?.roomInfo;
  }
  get roomId() {
    return this.roomInfo?.id;
  }

  _userId = "";
  get userId() {
    return this.isSingle ? this._userId : Player.id;
  }
  set userId(val) {
    if (this.isSingle) this._userId = val;
  }
  get owner() {
    return this.isSingle ? this.userId : this.roomInfo?.owner;
  }

  get isOwner() {
    return Player.id === this.roomInfo?.owner;
  }

  /**
   * 回收子弹，进入对象池
   * 此后不进入帧循环
   */
  removeBullets(bullet) {
    this.bullets.splice(this.bullets.indexOf(bullet), 1);

    bullet.parent.removeChild(bullet);
  }
}

export default new DataBus();
