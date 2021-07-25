import * as PIXI from "pixi.js";
import config from "../config.js";
import databus from "../databus.js";
import { createBtn, createText } from "../common/ui.js";
import { EventBus } from "../common/util";
import Debug from "../base/debug.js";

export default class Home extends PIXI.Container {
  constructor() {
    super();

    this.debug = new Debug();
    this.addChild(this.debug);
  }

  appendOpBtn() {
    this.addChild(
      createText({
        str: "小游戏帧同步功能示例",
        x: config.GAME_WIDTH / 2,
        y: 287,
        style: {
          fontSize: 64,
          fill: "#515151",
        },
      }),
      createBtn({
        img: "images/quickStart.png",
        x: config.GAME_WIDTH / 2,
        y: 442,
        onclick: () => {
          if (databus.isSingle) {
            EventBus.emit("onGameStart");
          } else {
            this.gameServer.createMatchRoom();
          }
         
        },
      }),
      createBtn({
        img: "images/createRoom.png",
        x: config.GAME_WIDTH / 2,
        y: 582,
        onclick: () => {
          if (this.handling) {
            return;
          }
          this.handling = true;
          // wx.showLoading({
          //     title: '房间创建中...',
          // })
          console.log("房间创建中...");
          this.gameServer.createRoom().then(() => {
            // wx.hideLoading();
            console.log("房间创建完成");
            this.handling = false;
          });
        },
      })
    );
  }

  launch(gameServer) {
    this.gameServer = gameServer;
    databus.matchPattern = void 0;
    this.appendOpBtn();
  }
}
