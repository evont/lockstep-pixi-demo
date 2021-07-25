import * as PIXI from "pixi.js";
import config, { gameConfig, gameInfo, matchConfig } from "./config.js";
import databus from "./databus.js";
import { eventLog } from "./common/util";
import { Room, Listener, ErrCode, Player, types } from "./mgobe/MGOBE";
class GameServer {
  constructor() {
    this.init();

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
    // this.bindEvents();

    this.isConnected = true;
    this.isLogin = false;
    // 记录网路状态
    // wx.getNetworkType({
    //   success: (res) => {
    //     this.isConnected = !!(res.networkType !== "none");
    //   },
    // });
  }

  initSDK() {
    return new Promise((resolve, reject) => {
      if (this.isInited()) {
        reject({ code: ErrCode.EC_OK });
      }
      Listener.init(gameInfo, gameConfig, (event) => {
        console.log("init complete", event.code);
        if (event.code === 0) {
          this.room = new Room();
          this.gameId = gameInfo.gameId;
          Listener.add(this.room);

          this.setBroadcastCallbacks(this.room, null, {});

          resolve({ code: event.code });
        }
      });
    });
  }
  /**
   * 判断 MGOBE SDK 是否初始化完成
   */
  isInited() {
    // 初始化成功后才有玩家ID
    return !!Player && !!Player.id;
  }
  /**
   * 设置房间广播回调函数
   * @param broadcastCallbacks
   */
  setBroadcastCallbacks(room, context, broadcastCallbacks) {
    if (!room) {
      return;
    }

    // 默认回调函数
    const generateDefaultCallback = () => () => null;

    const defaultCallbacks = {
      onMatch: () => generateDefaultCallback("onMatch"),
      onJoinRoom: () => generateDefaultCallback("onJoinRoom"),
      onLeaveRoom: () => generateDefaultCallback("onLeaveRoom"),
      onChangeRoom: () => generateDefaultCallback("onChangeRoom"),
      onDismissRoom: () => generateDefaultCallback("onDismissRoom"),
      onStartFrameSync: () => generateDefaultCallback("onStartFrameSync"),
      onStopFrameSync: () => generateDefaultCallback("onStopFrameSync"),
      onRecvFrame: () => {
        generateDefaultCallback("onRecvFrame");
        // 每次收到帧广播都需要计算
        // calcFrame(event.data.frame);
      },
      onChangeCustomPlayerStatus: () =>
        generateDefaultCallback("onChangeCustomPlayerStatus"),
      onRemovePlayer: () => generateDefaultCallback("onRemovePlayer"),
      onRecvFromClient: () => generateDefaultCallback("onRecvFromClient"),
      onRecvFromGameSvr: () => generateDefaultCallback("onRecvFromGameSvr"),
      onAutoRequestFrameError: () =>
        generateDefaultCallback("onAutoRequestFrameError"),
    };

    // 给 room 实例设置广播回调函数
    Object.keys(defaultCallbacks).forEach((key) => {
      const callback = broadcastCallbacks[key]
        ? broadcastCallbacks[key].bind(context)
        : defaultCallbacks[key];
      room[key] = callback;
    });
  }

  init() {
    this.initSDK().then((event) => {
      if (event.code === ErrCode.EC_OK) {
        this.room.onUpdate = () => this.onRoomUpdate();
        this.setBroadcastCallbacks(this.room, this, this);
        this.clearCallQueue();
      }
    });
  }
  bindEvents() {
    // const reconnect = () => {
    //   // 如果logout了，需要先logout再connect
    //   if (this.isLogout && this.isDisconnect) {
    //     this.server
    //       .login()
    //       .then((res) => {
    //         console.log("networkType change or onShow -> login", res);
    //         this.server.reconnect().then((res) => {
    //           console.log("networkType change or onShow -> reconnect", res);
    //           ++this.reconnectSuccess;
    //           console.log("游戏已连接")
    //         });
    //       })
    //       .catch(() => ++this.reconnectFail);
    //   } else {
    //     // 否则只需要处理对应的掉线事件
    //     if (this.isLogout) {
    //       this.server
    //         .login()
    //         .then((res) =>
    //           console.log("networkType change or onShow -> login", res)
    //         );
    //     }
    //     if (this.isDisconnect) {
    //       this.server
    //         .reconnect()
    //         .then((res) => {
    //           ++this.reconnectSuccess;
    //           console.log("networkType change or onShow -> reconnect", res);
    //           console.log("游戏已连接")
    //         })
    //         .catch(() => ++this.reconnectFail);
    //     }
    //   }
    // };
    // wx.onNetworkStatusChange((res) => {
    //   console.log("当前是否有网路连接", res.isConnected);
    //   let isConnected = res.isConnected;
    //   console.log(
    //     "当前状态",
    //     this.isLogout,
    //     this.isDisconnect,
    //     this.isConnected
    //   );
    //   // 网络从无到有
    //   if (!this.isConnected && isConnected) {
    //     reconnect();
    //   }
    //   this.isConnected = isConnected;
    // });
    // this.server.onLogout(() => {
    //   console.log("onLogout");
    //   this.isLogout = true;
    // });
    // this.server.onDisconnect((res) => {
    //   console.log("onDisconnect", res);
    //   this.isDisconnect = true;
    //   res.type !== "game" &&
    //     console.log("游戏已掉线...")
    //   res.type === "game" &&
    //     (function(that) {
    //       function relink() {
    //         that.server
    //           .reconnect()
    //           .then(function(res) {
    //             console.log("networkType change or onShow -> reconnect", res);
    //             ++that.reconnectSuccess;
    //           })
    //           .catch(relink);
    //       }
    //       relink();
    //     })(this);
    // });
    // wx.onShow(() => {
    //   reconnect();
    // });
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
    this.setBroadcastCallbacks(this.room, this, {});
  }
  onRecvFromClient() {
    console.log("Reveived");
    this.startGame();
  }
  // onMatch(res) {
  //   const { errCode, roomInfo } = res.data;

  //   if (errCode === ErrCode.EC_OK) {
  //     databus.roomId = this.roomId = roomInfo.id || "";
  //     this.room.initRoom(roomInfo);
  //     console.log("Start game")
  //     this.room.sendToClient({
  //       recvPlayerList: [],
  //       recvType: types.RecvType.ROOM_ALL,
  //       msg: "START",
  //     });
  //   }

  // let nickname = res.groupInfoList[0].memberInfoList[0].nickName;

  // databus.roomId = this.roomId = res.roomServiceAccessInfo || "";

  // this.joinRoom(databus.currAccessInfo)
  //   .then((res) => {
  //     let data = res.data || {};
  //     databus.selfClientId = data.clientId;

  //     this.updateReadyStatus(true);

  //     if (databus.userInfo.nickName !== nickname) {
  //       setTimeout(
  //         this.server.broadcastInRoom.bind(this, {
  //           msg: "START",
  //         }),
  //         3000
  //       );
  //     }

  //     // wx.showToast({
  //     //   title: "匹配成功！3秒后开始游戏",
  //     //   icon: "none",
  //     //   duration: 2000,
  //     // });
  //     console.log("匹配成功！3秒后开始游戏");
  //   })
  //   .catch((e) => {
  //     console.log(e);
  //   });
  // }

  onStartFrameSync() {
    this.event.emit("onGameStart");
    /*if ( needEmit ) {
            this.event.emit('onGameStart');
        }*/

    this.hasGameStart = true;

    this.debugTime = setInterval(() => {
      this.sendFrame({
        c: ++this.statCount,
        t: +new Date(),
        e: config.msg.STAT,
      });

      let time = new Date() - this.startTime;

      databus.debugMsg = [
        `游戏时间: ${parseInt(time / 1000) + "s"}`,
        `期望帧数: ${Math.floor(time / this.frameInterval)}帧`,
        `实收帧数: ${this.svrFrameIndex}帧`,
        `指令延迟: ${this.avgDelay.toFixed(1) + "(" + this.delay + ")"}ms`,
      ];
      this.reconnectSuccess &&
        databus.debugMsg.push(`重连成功: ${this.reconnectSuccess}`);
      this.reconnectFail &&
        databus.debugMsg.push(`重连失败: ${this.reconnectFail}`);

      databus.gameInstance.debug.updateDebugMsg(databus.debugMsg);
    }, 1000);
  }
  onStopFrameSync() {
    this.settle();
    this.reset();
    this.event.emit("onGameEnd");

    clearInterval(this.debugTime);
  }
  endGame() {
    return this.room.stopFrameSync();
  }

  clear() {
    this.reset();
    databus.reset();
    this.event.emit("backHome");
  }
  onRecvFrame(res) {
    const frame = res.data.frame;
    if (frame.id % 300 === 0) {
      console.log("heart");
    }
    this.svrFrameIndex = frame.id;
    this.frames.push(frame);

    if (!this.reconnecting) {
      (res.items || []).forEach((oneFrame) => {
        let obj = oneFrame.data;

        if (obj.e === config.msg.STAT && oneFrame.playerId === databus.userId) {
          this.delay = new Date() - obj.t;
          this.avgDelay = (this.avgDelay * (obj.c - 1) + this.delay) / obj.c;
        }
      });
    }

    if (this.frames.length > this.frameJitLenght) {
      this.frameStart = true;
    }

    if (!this.hasSetStart) {
      console.log("get first frame");
      this.startTime = new Date() - this.frameInterval;
      this.hasSetStart = true;
    }

    if (this.reconnecting && res.frameId >= this.reconnectMaxFrameId) {
      this.reconnecting = false;
      this.startTime =
        new Date() - this.frameInterval * this.reconnectMaxFrameId;
      // wx.hideLoading();
    }
  }
  onRoomUpdate() {
    console.log("onRoomUpdate:", this.room.roomInfo.playerList);
    if (
      this.room.roomInfo &&
      this.room.roomInfo.playerList &&
      this.room.roomInfo.playerList.find((p) => p.id === Player.id)
    ) {
      this.event.emit("onRoomInfoChange", this.room.roomInfo);
    }
  }
  login() {
    let prm = Promise.resolve();
    if (!this.isInited()) {
      prm = new Promise((resolve) => this._callqueue.push(resolve));
    }
    return prm.then(() => {
      this.room.initRoom();
      this.room.getRoomDetail((res) => {
        const { data } = res;
        if (data.roomInfo) {
          console.log("查询到还有没结束的游戏", data);
          const isConfirm = window.confirm(
            "查询到之前还有尚未结束的游戏，是否重连继续游戏？"
          );
          if (isConfirm) {
            // this.onRoomInfoChange(res.data.roomInfo);
            databus.owner = data.roomInfo.owner;
            databus.roomId = data.roomInfo.id;
            databus.userId = Player.id;
            this.room.initRoom(data.roomInfo);
            // this.reconnectMaxFrameId = 0;
            // this.reconnecting = true;
            this.isLogin = true;
            this.onStartFrameSync();
            this.startGame();
          }
        }
      });
    });
  }
  // 邀请加入房间: https://cloud.tencent.com/document/product/1038/37755
  // 回调走的是 onJoinRoom 和 onLeaveRoom
  createRoom() {
    return new Promise((resolve, reject) => {
      const playerInfo = {
        name: "玩家-房主",
        customPlayerStatus: 0,
        customProfile: "",
      };

      const createRoomPara = {
        roomName: "pixi room",
        roomType: "1v1",
        maxPlayers: 2,
        isPrivate: true,
        customProperties: "",
        playerInfo,
      };

      this.room.initRoom();
      this.room.createRoom(createRoomPara, (event) => {
        this.lockSubmit = false;
        if (event.code === ErrCode.EC_OK) {
          const data = event.data || {};
          databus.roomId = this.roomId = data.roomInfo.id || "";
          databus.userId = Player.id;
          databus.owner = data.roomInfo.owner;
          eventLog(`创建房间成功，房间ID：${data.roomInfo.id}`);
          this.event.emit("createRoom");
          resolve();
        } else {
          reject();
          eventLog(`创建房间失败，错误码：${event.code}`);
        }
      });
    });
  }
  // onJoinRoom(event) {
  //   const { roomInfo } = event.data;
  //   if (
  //     roomInfo &&
  //     roomInfo.playerList &&
  //     roomInfo.playerList.find((p) => p.id === Player.id)
  //   ) {
  //     this.event.emit("onRoomInfoChange", this.room.roomInfo);
  //   }
  // }

  // SDK 随机匹配
  createMatchRoom() {
    // 注意：这里没有使用匹配属性，如果匹配规则中有设置匹配属性，这里需要做调整
    const matchAttributes = [];
    const playerInfo = {
      name: `玩家-${Player.id}`,
      customPlayerStatus: 1,
      customProfile: Player.customProfile,
      matchAttributes,
    };
    const matchRoomPara = {
      playerInfo,
      matchCode: matchConfig.single,
    };

    this.room.initRoom();
    this.room.matchPlayers(matchRoomPara, (event) => {
      if (event.code === ErrCode.EC_OK) {
        const { roomInfo } = event.data;
        console.log("匹配成功", roomInfo);
        databus.matchPattern = true;
        this.event.emit("createRoom");
        databus.roomId = this.roomId = roomInfo.id || "";
        this.room.initRoom(roomInfo);
        this.room.sendToClient({
          recvPlayerList: [],
          recvType: types.RecvType.ROOM_ALL,
          msg: "START",
        });
      } else {
        console.log("匹配失败", event.code);
      }
    });

    // this.event.emit("onRoomInfoChange", {
    //   memberList: [
    //     { customProfile: Player.customProfile, name: Player.name },
    //     {
    //       customProfile: "images/avatar_default.png",
    //       name: "正在匹配玩家...",
    //     },
    //   ],
    // });
  }
  _callqueue = [];
  clearCallQueue() {
    if (this._callqueue.length) {
      this._callqueue.forEach((item) => item());
    }
  }
  joinRoom(roomId) {
    if (!roomId) {
      return console.log("%c请输入正确的房间ID", "background: red;color: #fff");
    }
    let prm = Promise.resolve();
    if (!this.isInited()) {
      prm = new Promise((resolve) => this._callqueue.push(resolve));
    }
    return prm.then(() => {
      this.room.initRoom({ id: roomId });
      return new Promise((resolve, reject) => {
        this.room.getRoomDetail((res) => {
          const { data } = res;
          if (data.roomInfo) {
            this.room.joinRoom(
              {
                playerInfo: {
                  name:
                    databus.owner === Player.id ? "玩家-房主" : "玩家-受邀者",
                  customPlayerStatus: 1,
                },
              },
              resolve
            );
          } else {
            reject()
          }
        });
      });
    });
  }
  sendFrame(frameData) {
    const data = { ...frameData, ...databus.userInfo, n: databus.userId };
    this.hasGameStart && this.room.sendFrame({ data });
  }
  getRoomInfo() {
    return new Promise((resolve) => {
      Room.getRoomByRoomId(
        {
          roomId: this.roomId,
        },
        resolve
      );
    });
  }
  startGame() {
    return this.room.startFrameSync();
  }
  memberLeaveRoom(callback) {
    this.room.leaveRoom().then((res) => {
      if (res.errCode === 0) this.clear();

      callback && callback(res);
    });
  }
  ownerLeaveRoom(callback) {
    this.room.dismissRoom({}, (event) => {
      if (event.code === 0) this.clear();
      callback && callback();
    });
  }
  onDismissRoom() {
    this.clear();
  }
  cancelMatch(res) {
    this.room.cancelPlayerMatch(res);
  }
  updateReadyStatus(customPlayerStatus) {
    return this.room.changeCustomPlayerStatus({
      customPlayerStatus,
    });
  }
  update(dt) {
    if (!this.frameStart) {
      return;
    }
    // 重连中不执行渲染
    if (!this.reconnecting) {
      databus.gameInstance.renderUpdate(dt);
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
    }
  }
  execFrame() {
    let frame = this.frames.shift();

    // 每次执行逻辑帧，将指令同步后，演算游戏状态
    databus.gameInstance.logicUpdate(this.frameInterval, frame.id);

    (frame.items || []).forEach((oneFrame) => {
      let obj = oneFrame.data;
      // 如果是重新进入房间的话，复位玩家位置
      if (this.isLogin) {
        if (databus.playerMap[obj.n]) {
          this.isLogin = false;
          const { x, y, hp, desDegree } = obj;
          databus.playerMap[obj.n].resetRender({
            x,
            y,
            hp,
            desDegree,
          });
          obj.e = config.msg.MOVE_STOP;
        }
      }

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

    databus.gameInstance.preditUpdate(this.frameInterval);
  }
  settle() {
    databus.gameover = true;

    if (databus.playerList[0].hp > databus.playerList[1].hp) {
      databus.playerList[0].userData.win = true;
    } else {
      databus.playerList[1].userData.win = true;
    }

    this.gameResult = databus.playerList.map((player) => {
      return player.userData;
    });
  }
}

export default new GameServer();
