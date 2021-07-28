import { getDeviceInfo } from "./common/util.js";

import _config from "../../config.json";

const deviceinfo = getDeviceInfo();

export default {
  debug: true,

  dpr: deviceinfo.devicePixelRatio,
  windowWidth: deviceinfo.windowWidth,
  windowHeight: deviceinfo.windowHeight,

  GAME_WIDTH: 667 * 2,
  GAME_HEIGHT: 375 * 2,

  pixiOptions: {
    backgroundColor: 0,
    antialias: false,
    sharedTicker: true,
  },

  roomState: {
    inTeam: 1,
    gameStart: 2,
    gameEnd: 3,
    roomDestroy: 4,
  },

  deviceinfo,

  resources: [
    "images/bg.png",
    "images/aircraft1.png",
    "images/aircraft2.png",
    "images/bullet_blue.png",
    "images/default_user.png",
    "images/avatar_default.png",
    "images/hosticon.png",
    "images/iconready.png",
  ],

  msg: {
    SHOOT: 1,
    MOVE_DIRECTION: 2,
    MOVE_STOP: 3,
    STAT: 4,
  },

  roleMap: {
    owner: 1,
    partner: 0,
  },

  playerHp: 20,

  loginState: {
    EMPTY: 0,
    REJOIN: 1,
    NOREJOIN: 1
  }
};

/**
 * 随机产生 openId
 */
const mockOpenId = () => {
  const mkey = "__MOCK_OPENID";
  const localOpenId = localStorage.getItem(mkey);
  if (localOpenId) return localOpenId;
  let str = Date.now().toString(36);

  for (let i = 0; i < 7; i++) {
    str += Math.ceil(Math.random() * 10 ** 4).toString(36);
  }
  localStorage.setItem(mkey, str);
  return str;
};

const openId = mockOpenId();
export const gameInfo = {
  openId,
  gameId: _config.gameId, // 替换为控制台上的“游戏ID”
  secretKey: _config.secretKey, // 替换为控制台上的“游戏key””
};

export const gameConfig = {
  url: _config.url, // 替换为控制台上的“域名”
  reconnectMaxTimes: 5,
  reconnectInterval: 1000,
  resendInterval: 1000,
  resendTimeout: 10000,
  isAutoRequestFrame: true,
};

export const matchConfig = {
  single: _config.matchId,
};
