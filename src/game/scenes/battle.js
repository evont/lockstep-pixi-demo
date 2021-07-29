import * as PIXI from "pixi.js";
import config from "../config.js";
import JoyStick from "../base/joystick.js";
import Player from "../base/player.js";
import Skill from "../base/skill.js";
import Hp from "../base/hp.js";
import databus from "../databus.js";
import { createBtn } from "../common/ui.js";

import { checkCircleCollision } from "../common/util.js";

import Debug from "../base/debug.js";

import { createText } from "../common/ui.js";

export default class Battle extends PIXI.Container {
  constructor() {
    super();
  }

  launch(gameServer) {
    this.initWithServer(gameServer);
  }

  initWithServer(gameServer) {
    this.gameServer = gameServer;

    this.debug = new Debug();
    this.addChild(this.debug);

    this.initPlayer();

    // 虚拟摇杆
    this.joystick = new JoyStick((e) => {
      let evt =
        e === -9999
          ? { e: config.msg.MOVE_STOP }
          : {
              e: config.msg.MOVE_DIRECTION,
              d: e.degree,
            };
      gameServer.sendFrame(evt);
    });
    this.addChild(this.joystick);

    // 技能按钮
    this.skill = new Skill();
    this.skill.eventemitter.on("click", () => {
      gameServer.sendFrame({
        e: config.msg.SHOOT,
      });
    });
    this.addChild(this.skill);

    this.appendBackBtn();

    this.onRoomInfoChange();

    this.joystick.enable();
    this.skill.enable();

    gameServer.mockFrame?.();
  }

  appendBackBtn() {
    const back = createBtn({
      img: "images/goBack.png",
      x: 104,
      y: 68,
      onclick: () => {
        this.showModal("离开房间会游戏结束！你确定吗？");
      },
    });

    this.addChild(back);
  }

  onRoomInfoChange() {
    this.gameServer.event.on(
      "onRoomInfoChange",
      ((res) => {
        res.playerList.length < 2 &&
          this.showModal("对方已离开房间，无法继续进行PK！", true);
      }).bind(this)
    );
  }

  initPlayer() {
    let memberList = [];
    if (databus.isSingle) {
      memberList = [
        {
          id: "3p7o464p",
          name: "evont",
          customPlayerStatus: 1,
          isRobot: false,
        },
        {
          id: "q1qgy9mv",
          name: "evont2",
          customPlayerStatus: 1,
          isRobot: true,
        },
      ];
      databus.userId = memberList[0].id;
    } else {
      memberList = this.gameServer.room.roomInfo.playerList || [];
    }
    memberList.forEach((member, index) => {
      let { id, name: nickname, customPlayerStatus, isRobot } = member;
      let player = new Player();
      player.setData(member);
      this.addChild(player);
      player.isRobot = isRobot;
      let hp = new Hp({
        width: 231,
        height: 22,
        hp: config.playerHp,
      });
      this.addChild(hp);
      player.hpRender = hp;
      player.userId = id;
      player.y = config.GAME_HEIGHT / 2;
      player.frameY = player.y;
      if (id === databus.owner || (databus.matchPattern && index)) {
        player.x = player.width / 2;
        player.setDirection(0);
        hp.setPos(330, 56);

        this.createPlayerInformation(
          hp,
          nickname,
          !!customPlayerStatus,
          (name, value) => {
            value.x = hp.graphics.x - value.width / 2;
            name ? this.addChild(name, value) : this.addChild(value);
          }
        );
      } else {
        player.x = config.GAME_WIDTH - player.width / 2;
        player.setDirection(180);
        hp.setPos(config.GAME_WIDTH - 231 - 253, 56);

        this.createPlayerInformation(
          hp,
          nickname,
          !!customPlayerStatus,
          (name, value) => {
            value.x = hp.graphics.x - value.width / 2;
            name ? this.addChild(name, value) : this.addChild(value);
          }
        );
      }
      player.frameX = player.x;
      player.userId = id;

      databus.playerMap[id] = player;
      databus.playerList.push(player);
      console.log("init over")
    });
  }

  createPlayerInformation(hp, nickname, isName, fn) {
    let name, value;
    isName &&
      (name = createText({
        str: nickname,
        style: { fontSize: 28, align: "center", fill: "#1D1D1D" },
        left: true,
        x: hp.graphics.x,
        y: 96,
      }));
    value = createText({
      str: "生命值：",
      style: {
        fontSize: 24,
        fill: "#383838",
      },
      y: hp.graphics.y + hp.graphics.height / 2,
    });

    fn(name, value);
  }

  renderCount(count) {
    this.countdownText = createText({
      str: `倒计时${count}秒`,
      x: config.GAME_WIDTH / 2,
      y: 330,
    });
    this.addChild(this.countdownText);
  }

  addCountdown(count) {
    if (this.countdownText) {
      this.removeChild(this.countdownText);
    }

    this.renderCount(count--);
    if (count >= 0) {
      setTimeout(() => {
        this.addCountdown(count);
      }, 1000);
    } else {
      setTimeout(() => {
        this.removeChild(this.countdownText);
      }, 1000);
    }
  }

  renderUpdate(dt) {
    if (databus.gameover) {
      return;
    }

    databus.playerList.forEach((player) => {
      player.renderUpdate(dt);
    });
    databus.bullets.forEach((bullet) => {
      bullet.renderUpdate(dt);
    });
  }

  logicUpdate(dt, frameId) {
    if (databus.gameover) {
      return;
    }

    if (!databus.isSingle) {
      // 收到第一帧开始倒计时
      if (frameId === 1) {
        this.addCountdown(3);
      }
    }

    databus.playerList.forEach((player) => {
      player.frameUpdate(dt);
    });

    databus.bullets.forEach((bullet) => {
      bullet.frameUpdate(dt);
      // 碰撞检测的仲裁逻辑
      databus.playerList.forEach((player) => {
        if (
          bullet.sourcePlayer !== player &&
          checkCircleCollision(player.collisionCircle, bullet.collisionCircle)
        ) {
          databus.removeBullets(bullet);
          player.hp--;

          player.hpRender.updateHp(player.hp);

          if (player.hp <= 0 && this.gameServer) {
            this.gameServer.settle();
            this.gameServer.endGame();
          }
        }
      });
    });
  }

  // 指令输入后，计算下一个逻辑帧的状态，方便渲染帧逼近
  preditUpdate(dt) {
    databus.playerList.forEach((player) => {
      player.preditUpdate(dt);
    });

    databus.bullets.forEach((bullet) => {
      bullet.preditUpdate(dt);
    });
  }

  showModal(content) {
    // wx.showModal({
    //     title: '温馨提示',
    //     content,
    //     showCancel: !isCancel,
    //     success: (res) => {
    //         if ( res.confirm ) {
    //             if ( databus.selfMemberInfo.role === config.roleMap.owner ) {
    //                 this.gameServer.ownerLeaveRoom();
    //             } else {
    //                 this.gameServer.memberLeaveRoom();
    //             }
    //         }
    //     }
    // })
    const isConfirm = window.confirm(content);
    if (isConfirm) {
      if (databus.isSingle) {
        this.gameServer.clear();
      } else {
        if (databus.isOwner) {
          this.gameServer.ownerLeaveRoom();
        } else {
          this.gameServer.memberLeaveRoom();
        }
      }
    }
  }

  _destroy() {
    this.gameServer?.event.off("onRoomInfoChange");
  }
}
