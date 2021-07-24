import * as PIXI from "pixi.js";
import config from "./config.js";
import databus from "./databus.js";
import BackGround from "./base/bg.js";
import Tween from "./base/tween.js";
import gameServer from "./gameserver.js";
// import login from "./base/login.js";
import Room from "./scenes/room.js";
import Battle from "./scenes/battle.js";
// import Result      from './scenes/result.js';
import Home from "./scenes/home.js";
import { eventLog } from "./common/util.js";
import { Player } from "./mgobe/MGOBE";
class App extends PIXI.Application {
  constructor() {
    super({
      width: config.GAME_WIDTH,
      height: config.GAME_HEIGHT,
      ...config.pixiOptions,
    });

    this.checkLink();
    // 适配小游戏的触摸事件
    this.renderer.plugins.interaction.mapPositionToPoint = (point, x, y) => {
      point.x = x * 2 * (667 / window.innerWidth);
      point.y = y * 2 * (375 / window.innerHeight);
    };

    this.aniId = null;
    this.bindLoop = this.loop.bind(this);

    config.resources.forEach((item) => this.loader.add(item));
    this.loader.load(this.init.bind(this));
  }
  runScene(Scene) {
    let old = this.stage.getChildByName("scene");

    while (old) {
      if (old._destroy) {
        old._destroy();
      }
      old.destroy(true);
      this.stage.removeChild(old);
      old = this.stage.getChildByName("scene");
    }

    let scene = new Scene();
    scene.name = "scene";
    scene.sceneName = Scene.name;
    scene.launch(gameServer);
    this.stage.addChild(scene);

    return scene;
  }
  scenesInit() {
    // 从会话点进来的场景
    if (databus.roomId) {
      this.joinToRoom();
    } else {
      this.runScene(Home);
    }

    gameServer.event.on("backHome", () => {
      this.runScene(Home);
    });

    gameServer.event.on("createRoom", () => {
      this.runScene(Room);
    });

    gameServer.event.on("onGameStart", () => {
      databus.gameInstance = this.runScene(Battle);
    });

    gameServer.event.on("onGameEnd", () => {
      gameServer.gameResult.forEach((member) => {
        var isSelf = member.nickname === databus.userInfo.nickName;
        if (isSelf) {
          window.alert(member.win ? "你已获得胜利" : "你输了");
          gameServer.clear();
        }
        // isSelf && wx.showModal({
        //     content: member.win ? "你已获得胜利" : "你输了",
        //     confirmText: "返回首页",
        //     confirmColor: "#02BB00",
        //     showCancel: false,
        //     success: () => {
        //        gameServer.clear();
        //     }
        // });
      });
    });
    this.runScene(Home);
  }
  init() {
    this.scaleToScreen();

    this.bg = new BackGround();
    this.stage.addChild(this.bg);

    this.ticker.stop();
    this.timer = +new Date();
    this.aniId = window.requestAnimationFrame(this.bindLoop);

    // login.do(() => {
    //   gameServer.login().then(() => {
    //     this.scenesInit();
    //   });
    // });
    this.scenesInit();
  }
  scaleToScreen() {
    const x = window.innerWidth / 667;
    const y = window.innerHeight / 375;
    if (x > y) {
      this.stage.scale.x = y / x;
      this.stage.x = ((1 - this.stage.scale.x) / 2) * config.GAME_WIDTH;
    } else {
      this.stage.scale.y = x / y;
      this.stage.y = ((1 - this.stage.scale.y) / 2) * config.GAME_HEIGHT;
    }
  }
  loop() {
    let time = +new Date();
    this._update(time - this.timer);
    this.timer = time;
    this.renderer.render(this.stage);
    this.aniId = window.requestAnimationFrame(this.bindLoop);
  }

  _update(dt) {
    gameServer.update(dt);
    Tween.update();
  }
  joinToRoom() {
    eventLog("加入房间中");
    gameServer.joinRoom(databus.roomId).then(res => {
      let data = res.data || {};
      console.log(res.data, Player.id);
      databus.userId = Player.id;
      databus.owner = data.owner;
      gameServer.roomId = databus.roomId;
      
      this.runScene(Room);
    })
  }
  checkLink() {
    const urlParams = new URL(window.location.href);
    const roomId = urlParams.searchParams.get("roomId");
    if (!roomId) return;
    if (!databus.roomId) {
      databus.roomId = roomId;
    }
  }
}

export default new App();
