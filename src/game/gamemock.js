import * as PIXI from "pixi.js";
import databus from "./databus.js";
import config from "./config.js";
import mockFrame from "./mock.json";
class GameMock {
  constructor() {

    this.event = new PIXI.utils.EventEmitter();

    // 用于存房间信息
    this.roomInfo = {};

    // 用于标记帧同步房间是否真正开始，如果没有开始，不能发送指令，玩家不能操作
    this.hasGameStart = false;
    // 帧同步帧率
    this.fps = 30;
    // 逻辑帧的时间间隔
    this.frameInterval = parseInt(1000 / this.fps);
    // 为了防止网络抖动设置的帧缓冲数，类似于放视频
    this.frameJitLenght = 2;

    this.gameResult = [];

    // 用于标识是否重连中
    this.reconnecting = false;
    // 重连回包后，用于标识重连完成的帧号
    this.reconnectMaxFrameId = 0;
    // 重连成功次数
    this.reconnectSuccess = 0;
    // 重连失败次数
    this.reconnectFail = 0;

    this.reset();

    this.isConnected = true;
    this.isLogin = false;
  }
  reset() {
    this.isDisconnect = false;
    this.isLogout = false;
    if (this.room) {
      this.room.initRoom();
      this.room.onUpdate = null;
    }
    // 本地缓冲帧队列
    this.frames = [];
    // 用于标记帧同步房间是否真正开始，如果没有开始，不能发送指令，玩家不能操作
    this.frameStart = false;
    // 游戏开始的时间
    this.startTime = new Date();
    // 当前游戏运行的帧位
    this.currFrameIndex = 0;
    // 当前收到的最新帧帧号
    this.svrFrameIndex = 0;
    this.hasSetStart = false;

    this.statCount = 0;
    this.avgDelay = 0;
    this.delay = 0;
    this.isLogin = false;
  }
  clear() {
    this.reset();
    databus.reset();
    this.event.emit("backHome");
  }
  update(dt) {
    if (!this.frameStart) {
      return;
    }
    // 本地从游戏开始到现在的运行时间
    const nowFrameTick = new Date() - this.startTime;
    const preFrameTick = this.currFrameIndex * this.frameInterval;

    let currTimeDelta = nowFrameTick - preFrameTick;

    if (currTimeDelta >= this.frameInterval) {
      if (this.frames.length) {
        this.execFrame();
        this.currFrameIndex++;
      }
    }
    // 可能是断线重连的场景，本地有大量的帧，快进
    if (this.frames.length > this.frameJitLenght) {
      while (this.frames.length) {
        this.execFrame();
        this.currFrameIndex++;
      }
      this.reconnecting = false;
      console.log(databus.playerList, databus.bullets)
    }


    // 重连中不执行渲染
    if (!this.reconnecting) {
      console.log("render update")
      databus.gameInstance?.renderUpdate(dt);
    }

  }
  mockFrame() {
    this.frames.push(...mockFrame);
    this.frameStart = true;
    this.reconnecting = true;
  }
  sendFrame() {
  }
  execFrame() {
    let frame = this.frames.shift();
    // 每次执行逻辑帧，将指令同步后，演算游戏状态
    databus.gameInstance?.logicUpdate(this.frameInterval, frame.id);
    databus.frameId = frame.id;
    (frame.items || []).forEach((oneFrame) => {
      let obj = oneFrame.data;
      switch (obj.e) {
        case config.msg.SHOOT:
          databus.playerMap[obj.n].shoot();
          break;

        case config.msg.MOVE_DIRECTION:
          databus.playerMap[obj.n].setDestDegree(obj.d);
          break;

        case config.msg.MOVE_STOP:
          databus.playerMap[obj.n].setSpeed(0);
          databus.playerMap[obj.n].desDegree =
            databus.playerMap[obj.n].frameDegree;
          break;
      }
    });

    databus.gameInstance?.preditUpdate(this.frameInterval);
  }
}

export default new GameMock();