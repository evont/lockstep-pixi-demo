import * as PIXI from "pixi.js";
import config from "../config.js";

import {
  velocityDecomposition,
  convertDegree2Radian,
  getDistance,
  getNumInRange,
  limitNumInRange,
  getMove,
} from "../common/util.js";

import Bullet from "../base/bullet.js";
import databus from "../databus.js";
// import music   from '../base/music.js';

const dpr = 2;

export default class Player extends PIXI.AnimatedSprite {
  constructor() {
    let alienImages = ["images/aircraft1.png", "images/aircraft2.png"];

    let textureArray = alienImages.map((item) => {
      return PIXI.Texture.from(item);
    });

    super(textureArray);

    this.init();
  }

  init() {
    this.width = 45 * dpr;
    this.height = 45 * dpr;

    this.setSpeed(0);
    this.hp = config.playerHp;
    this.anchor.set(0.5);
    this.rotation = 0;
    this.frameRotation = 0;
    this.animationSpeed = parseFloat((20 / 120).toFixed(2));
    this.play();

    this.setPos(config.GAME_WIDTH / 2, config.GAME_HEIGHT / 2);

    this.radius = parseInt(this.width / 2);
    this.userData = {};
    this.frameX = 0;
    this.frameY = 0;
    this.preditX = 0;
    this.preditY = 0;

    this.desDegree = 0;
    this.frameDegree = 0;
    this.currDegree = 0;
  }
  _userId = "";
  get userId() {
    return this._userId;
  }
  set userId(userId) {
    this._userId = userId;
    if (userId == databus.userId) {
      databus.userInfo = {
        x: this.x,
        y: this.y,
        hp: this.hp,
        desDegree: this.desDegree,
      };
    }
  }

  setDirection(degree) {
    this.desDegree = degree;
    this.frameDegree = degree;
    this.currDegree = degree;
    this.rotation = convertDegree2Radian(degree);
    this.frameRotation = this.rotation;
  }

  setData(data) {
    this.userData = data;
  }

  resetRender(data) {
    const { x, y, hp, desDegree } = data;
    if (x && y) {
      this.x = this.frameX = x;
      this.y = this.frameY = y;
      this.setPos(x, y);
    }
    if (hp) this.hp = hp;
    if (desDegree) this.setDirection(desDegree);
  }

  get collisionCircle() {
    return {
      center: { x: this.frameX, y: this.frameY },
      radius: this.radius,
    };
  }

  setPos(x, y) {
    if (x !== undefined) {
      this.position.x = x;
    }

    if (y !== undefined) {
      this.position.y = y;
    }
  }

  setSpeed(speed, rotation) {
    this.speed = speed;
    rotation = rotation || this.rotation;

    let { x, y } = velocityDecomposition(this.speed, rotation);
    this.speedX = x;
    this.speedY = -y;
  }

  shoot() {
    let bullet = new Bullet();
    databus.bullets.push(bullet);

    bullet.reset({
      //direction: this.rotation,
      direction: this.frameRotation,
      speed: 0.7,
      x: this.shootPoint.x,
      y: this.shootPoint.y,
    });

    bullet.sourcePlayer = this;

    this.parent.addChild(bullet);

    // music.playShoot();
  }

  // ????????????????????????
  get shootPoint() {
    let half = parseInt(this.width / 2);
    return {
      x: this.x + half * Math.cos(this.rotation),
      y: this.y + half * Math.sin(this.rotation),
    };
  }

  setDestDegree(degree) {
    this.desDegree = degree;
  }

  /**
   * ????????????????????????????????????????????????????????????????????????
   * ??????????????????????????????????????????????????????
   */
  renderUpdate(dt) {
    if (this.x !== this.preditX || this.y !== this.preditY) {
      console.log("position change");
      let dis = getDistance(
        { x: this.x, y: this.y },
        { x: this.preditX, y: this.preditY }
      );
      let temp = (dt / (1000 / 30)) * (0.2 * (1000 / 30));
      let percent = getNumInRange(temp / dis, 0, 1);

      this.x += (this.preditX - this.x) * percent;
      this.y += (this.preditY - this.y) * percent;
    }

    if (this.currDegree !== this.frameDegree) {
      const dis = getMove(this.currDegree, this.frameDegree);

      let temp = (dt / (1000 / 30)) * 10;
      let percent = getNumInRange(temp / Math.abs(dis), 0, 1);

      this.currDegree += dis * percent;

      this.currDegree = limitNumInRange(this.currDegree, 0, 360);
      this.rotation = convertDegree2Radian(this.currDegree);
    }
  }

  // ?????????????????????
  frameUpdate(dt) {
    let newX = this.frameX + this.speedX * dt;
    let newY = this.frameY + this.speedY * dt;

    // ????????????
    if (newX - this.radius >= 0 && newX + this.radius <= config.GAME_WIDTH) {
      this.frameX = newX;
    }

    if (newY - this.radius >= 0 && newY + this.radius <= config.GAME_HEIGHT) {
      this.frameY = newY;
    }

    // ???????????????????????????????????????????????????????????????
    if (this.frameDegree !== this.desDegree) {
      const dis = getMove(this.frameDegree, this.desDegree);

      if (Math.abs(dis) <= 10) {
        this.frameDegree = this.desDegree;
      } else {
        if (dis > 0) {
          this.frameDegree += 10;
        } else {
          this.frameDegree -= 10;
        }
      }

      this.frameDegree = limitNumInRange(this.frameDegree, 0, 360);

      let radian = convertDegree2Radian(this.frameDegree);
      this.frameRotation = radian;
      this.setSpeed(0.2, radian);
      if (this.userId == databus.userId) {
        databus.userInfo = {
          x: this.x,
          y: this.y,
          hp: this.hp,
          desDegree: this.desDegree,
        };
      }
    }
  }

  preditUpdate(dt) {
    let newX = this.frameX + this.speedX * dt;
    let newY = this.frameY + this.speedY * dt;

    // ????????????
    if (newX - this.radius >= 0 && newX + this.radius <= config.GAME_WIDTH) {
      this.preditX = newX;
    }

    if (newY - this.radius >= 0 && newY + this.radius <= config.GAME_HEIGHT) {
      this.preditY = newY;
    }
  }
}
