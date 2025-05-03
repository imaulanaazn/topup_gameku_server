import dotenv from "dotenv";
dotenv.config();

import express, { Express } from "express";
import getApp from "./app";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import advanced from "dayjs/plugin/advancedFormat";
import http from "http";
import process from "node:process";
import localeData from "dayjs/plugin/localeData";
import updateLocale from "dayjs/plugin/updateLocale";
import "dayjs/locale/id";
// Menambahkan kode untuk memantau penggunaan memori
function logMemoryUsage() {
  const used = process.memoryUsage();
  console.log("Memory usage:");
  for (let key in used) {
    console.log(
      `${key}: ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB`
    );
  }
}

(async () => {
  try {
    if (process.env.NODE_ENV.toLowerCase() === "development") {
      console.log(process.env);
    }
    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(advanced);
    dayjs.extend(localeData);
    dayjs.extend(updateLocale);
    dayjs.locale("id");

    dayjs.tz.setDefault(process.env.TZ || "Asia/Jakarta");
    const e: Express = express();
    const app = http.createServer(e);
    const port = process.env.PORT || 3000;
    getApp(e, app);

    app.listen(port, () => {
      console.log(`⚡️[${process.env.NODE_ENV}]: Server is running at ${port}`);
      logMemoryUsage();
    });

    app.on("error", (err) => {
      console.error(err);
    });
  } catch (error) {
    console.error(error);
  }
})();

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException", err);
});
