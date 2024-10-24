const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readline = require("readline");
const { DateTime } = require("luxon");
const crypto = require("crypto");
const winston = require("winston");

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    // Remove or modify colorize
    // winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message }) => {
      // Capitalize the log level and ensure it's displayed
      const uppercaseLevel = level.toUpperCase().padEnd(5);
      return `${timestamp} | ${uppercaseLevel} | ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

class FreeDogs {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://app.freedogs.bot",
      Referer: "https://app.freedogs.bot/",
      "Sec-Ch-Ua":
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    };
    this.maxed = [];
  }

  async countdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`Wait ${i} seconds to continue the loop`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    logger.info("");
  }

  async callAPI(initData) {
    const url = `https://api.freedogs.bot/miniapps/api/user/telegram_auth?invitationCode=oscKOfyL&initData=${initData}`;

    try {
      const response = await axios.post(url, {}, { headers: this.headers });
      if (response.status === 200 && response.data.code === 0) {
        return { success: true, data: response.data.data };
      } else {
        return { success: false, error: response.data.msg };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  isExpired(token) {
    const [header, payload, sign] = token.split(".");
    const decodedPayload = Buffer.from(payload, "base64").toString();

    try {
      const parsedPayload = JSON.parse(decodedPayload);
      const now = Math.floor(DateTime.now().toSeconds());

      if (parsedPayload.exp) {
        const expirationDate = DateTime.fromSeconds(
          parsedPayload.exp
        ).toLocal();
        logger.info(
          `Token expires on: ${expirationDate.toFormat("yyyy-MM-dd HH:mm:ss")}`
        );

        const isExpired = now > parsedPayload.exp;
        logger.info(
          `Has the token expired? ${
            isExpired
              ? "Yes, you need to replace the token"
              : "Not yet, you can continue using the token"
          }`
        );

        return isExpired;
      } else {
        logger.warn(`Perpetual token, expiration time cannot be read`);
        return false;
      }
    } catch (error) {
      logger.error(`Error: ${error.message}`);
      return true;
    }
  }

  async getGameInfo(token) {
    const url =
      "https://api.freedogs.bot/miniapps/api/user_game_level/GetGameInfo?";
    const headers = { ...this.headers, Authorization: `Bearer ${token}` };

    try {
      const response = await axios.get(url, { headers });
      if (response.status === 200 && response.data.code === 0) {
        const data = response.data.data;
        logger.info(`The current balance: ${data.currentAmount}`);
        logger.info(`Coin Pool: ${data.coinPoolLeft}/${data.coinPoolLimit}`);
        logger.info(
          `Number of clicks today: ${data.userToDayNowClick}/${data.userToDayMaxClick}`
        );
        if (data.userToDayNowClick === data.userToDayMaxClick) {
          this.maxed.push("max");
          return {
            success: false,
            error: "You have reached the maximum number of clicks today",
          };
        }
        return { success: true, data: data };
      } else {
        return { success: false, error: response.data.msg };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  md5(input) {
    return crypto.createHash("md5").update(input).digest("hex");
  }

  async collectCoin(token, gameInfo) {
    const url = "https://api.freedogs.bot/miniapps/api/user_game/collectCoin";
    const headers = { ...this.headers, Authorization: `Bearer ${token}` };

    let collectAmount = Math.min(
      gameInfo.coinPoolLeft,
      10000 - gameInfo.userToDayNowClick
    );
    const collectSeqNo = Number(gameInfo.collectSeqNo);
    const hashCode = this.md5(
      collectAmount + String(collectSeqNo) + "7be2a16a82054ee58398c5edb7ac4a5a"
    );

    const params = new URLSearchParams({
      collectAmount: collectAmount,
      hashCode: hashCode,
      collectSeqNo: collectSeqNo,
    });

    try {
      const response = await axios.post(url, params, { headers });
      if (response.status === 200 && response.data.code === 0) {
        logger.info(`Successfully collected ${collectAmount} coins`);
        return { success: true, data: response.data.data };
      } else {
        return { success: false, error: response.data.msg };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getTaskList(token) {
    const url = "https://api.freedogs.bot/miniapps/api/task/lists?";
    const headers = { ...this.headers, Authorization: `Bearer ${token}` };

    try {
      const response = await axios.get(url, { headers });
      if (response.status === 200 && response.data.code === 0) {
        const tasks = response.data.data.lists.filter(
          (task) => task.isFinish === 0
        );
        return { success: true, data: tasks };
      } else {
        return { success: false, error: response.data.msg };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async completeTask(token, taskId) {
    const url = `https://api.freedogs.bot/miniapps/api/task/finish_task?id=${taskId}`;
    const headers = { ...this.headers, Authorization: `Bearer ${token}` };

    try {
      const response = await axios.post(url, {}, { headers });
      if (response.status === 200 && response.data.code === 0) {
        return { success: true };
      } else {
        return { success: false, error: response.data.msg };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async processTasks(token, userId) {
    const taskListResult = await this.getTaskList(token);
    if (taskListResult.success) {
      for (const task of taskListResult.data) {
        logger.info(`Performing task: ${task.name}`);
        const completeResult = await this.completeTask(token, task.id);
        if (completeResult.success) {
          logger.info(
            `Completed task ${task.name} successfully | Reward: ${task.rewardParty}`
          );
        } else {
          logger.error(
            `Cannot complete task ${task.name}: ${completeResult.error}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      logger.error(
        `Unable to get task list for account ${userId}: ${taskListResult.error}`
      );
    }
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const tokenFile = path.join(__dirname, "token.json");
    let tokens = {};

    if (fs.existsSync(tokenFile)) {
      tokens = JSON.parse(fs.readFileSync(tokenFile, "utf8"));
    }

    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean)
      .map((v) => {
        let match = v.match(/tgwebappdata\=(.*?)(?=")/is);
        if (match) {
          return decodeURIComponent(match[1]);
        }
        return v;
      });
    while (true) {
      for (let i = 0; i < data.length; i++) {
        const rawInitData = data[i];
        const initData = rawInitData.replace(/&/g, "%26").replace(/=/g, "%3D");
        const userDataStr = decodeURIComponent(
          initData.split("user%3D")[1].split("%26")[0]
        );
        const userData = JSON.parse(decodeURIComponent(userDataStr));
        const userId = userData.id;
        const firstName = userData.first_name;

        logger.info(`Account ${i + 1} | ${firstName}`);

        let token = tokens[userId];
        let needNewToken = !token || this.isExpired(token);

        if (needNewToken) {
          logger.info(`Need to get new token for account ${userId}...`);
          const apiResult = await this.callAPI(initData);

          if (apiResult.success) {
            logger.info(`Successfully obtained token for account ${userId}`);
            tokens[userId] = apiResult.data.token;
            token = apiResult.data.token;
            fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2));
            logger.info(`New token has been saved for account ${userId}`);
          } else {
            logger.error(
              `Failed to get token for account ${userId}: ${apiResult.error}`
            );
            continue;
          }
        }

        const gameInfoResult = await this.getGameInfo(token);
        if (gameInfoResult.success) {
          if (gameInfoResult.data.coinPoolLeft > 0) {
            await this.collectCoin(token, gameInfoResult.data);
          } else {
            logger.warn(`No coins to collect for account ${userId}`);
          }

          await this.processTasks(token, userId);
        } else {
          logger.error(
            `Unable to get game information for account ${userId}: ${gameInfoResult.error}`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (this.maxed.length == data.length) {
        console.log("all daily left over!");
        break;
      } else {
        await this.countdown(180);
      }
    }
  }
}

const client = new FreeDogs();
client.main().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
