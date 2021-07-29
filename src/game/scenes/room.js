import * as PIXI from "pixi.js";
import config from "../config.js";
import { createBtn } from "../common/ui.js";
import databus from "../databus.js";
import { showTip } from "../common/util.js";
import { types, Player } from "../mgobe/MGOBE";

const emptyUser = {
  name: "点击邀请好友",
  customProfile: "images/avatar_default.png",
  isEmpty: true,
  customPlayerStatus: 0,
};

export default class Room extends PIXI.Container {
  constructor() {
    super();

    this.gameServer = null;
  }

  initUI() {
    let title = new PIXI.Text("1V1对战", {
      fontSize: 56,
      align: "center",
      fill: "#515151",
    });
    title.x = config.GAME_WIDTH / 2 - title.width / 2;
    title.y = 96;
    this.addChild(title);

    let vs = new PIXI.Text("VS", {
      fontSize: 64,
      align: "center",
      fill: "#515151",
    });
    vs.x = config.GAME_WIDTH / 2 - vs.width / 2;
    vs.y = 307;
    this.addChild(vs);
  }

  appendBackBtn() {
    const back = createBtn({
      img: "images/goBack.png",
      x: 104,
      y: 68,
      onclick: () => {
        const isConfirm = window.confirm("是否离开房间？");
        if (isConfirm) {
          if (databus.matchPattern) {
            this.gameServer.cancelMatch({
              matchType: types.MatchType.PLAYER_COMPLEX,
            });
            this.gameServer.clear();
            return;
          }

          if (databus.isOwner) {
            this.gameServer.ownerLeaveRoom();
          } else {
            this.gameServer.memberLeaveRoom();
          }
        }
      },
    });

    this.addChild(back);
  }

  appendOpBtn(member) {
    let { customPlayerStatus } = member;

    const isReady = customPlayerStatus === 1;
    let getReady = createBtn({
      img: "images/getReady.png",
      x: config.GAME_WIDTH / 2 - 159,
      y: config.GAME_HEIGHT - 160,
      onclick: () => {
        this.gameServer.updateReadyStatus(1 - customPlayerStatus);
      },
    });

    let start = createBtn({
      img: "images/start.png",
      x: config.GAME_WIDTH / 2 + 159,
      y: config.GAME_HEIGHT - 160,
      onclick: () => {
        if (!this.allReady) {
          showTip("全部玩家准备后方可开始");
        } else {
          this.gameServer.room.sendToClient({
            recvPlayerList: [],
            recvType: types.RecvType.ROOM_ALL,
            msg: "START",
          });
        }
      },
    });

    isReady && (getReady.alpha = 0.5);

    if (!this.allReady) {
      start.alpha = 0.5;
    }
    databus.isOwner ? this.addChild(getReady, start) : this.addChild(getReady);
  }

  clearUI() {
    this.removeChildren();
  }

  createOneUser(options) {
    const { customProfile, index, name, id, customPlayerStatus } = options;
    const padding = 136;

    const user = new PIXI.Sprite.from(
      customProfile || "images/avatar_default.png"
    );
    user.name = "player";
    user.width = 144;
    user.height = 144;
    user.x =
      index === 0
        ? config.GAME_WIDTH / 2 - user.width - padding
        : config.GAME_WIDTH / 2 + padding;
    user.y = 266;

    this.addChild(user);

    let nickname = new PIXI.Text(name, {
      fontSize: 36,
      align: "center",
      fill: "#515151",
    });
    nickname.anchor.set(0.5);
    nickname.x = user.width / 2;
    nickname.y = user.height + 23;
    user.addChild(nickname);

    if (id === databus.owner) {
      const host = new PIXI.Sprite.from("images/hosticon.png");
      host.scale.set(0.8);
      host.y = -30;
      user.addChild(host);
    }

    if (!!customPlayerStatus && !databus.matchPattern) {
      const ready = new PIXI.Sprite.from("images/iconready.png");
      ready.width = 40;
      ready.height = 40;
      ready.x = user.width;
      user.addChild(ready);
    }

    return user;
  }

  handleRoomInfo(res) {
    this.clearUI();

    this.initUI();
    const data = res.data || {};
    const roomInfo = data.roomInfo || {};
    const memberList = roomInfo.playerList || [];

    this.allReady = !memberList.find((member) => !member.customPlayerStatus);
    if (memberList.length === 1) {
      memberList.push(emptyUser);
    } else {
      memberList.reverse();
    }

    memberList.forEach((member, index) => {
      member.index = index;
      let user = this.createOneUser(member);
      if (member.id === Player.id) {
        !databus.matchPattern && this.appendOpBtn(member);
      }

      if (member.isEmpty) {
        user.interactive = true;
        user.on("pointerdown", () => {
          console.log(
            `%c[invite inlink] %c: ${location.protocol}//${location.host}?roomId=${databus.roomId}`,
            "background: green; padding: 0 10px; color: #fff;",
            ""
          );
        });
      }
    });

    this.appendBackBtn();
  }

  _destroy() {
    this.gameServer.event.off("onRoomInfoChange");
  }

  onRoomInfoChange(roomInfo) {
    this.handleRoomInfo({ data: { roomInfo } });
  }

  launch(gameServer) {
    this.gameServer = gameServer;
    this.onRoomInfoChangeHandler = this.onRoomInfoChange.bind(this);

    // 每次房间信息更新重刷UI
    gameServer.event.on("onRoomInfoChange", this.onRoomInfoChangeHandler);

    !databus.matchPattern &&
      gameServer.getRoomInfo(this.accessInfo).then((res) => {
        this.handleRoomInfo(res);
      });
  }
}
