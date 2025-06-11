import "./database";
import "@helper/logger";
import { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import { router, webhook } from "./api";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import { createSessions } from "@middleware/sessions";
import { Config } from "./config";
import requestTime from "@middleware/requestTime";
import { Server as HttpServer, IncomingMessage, ServerResponse } from "http";
import { Server } from "socket.io";
import { setupDI } from "@middleware/di";
import * as fs from "fs";
import * as path from "path";
import multer from "multer";

const getApp = async (
  app: Application,
  server: HttpServer<typeof IncomingMessage, typeof ServerResponse>
) => {
  const config = new Config();
  const resolvedPath = path.resolve("uploads");

  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
    console.log(`Folder created at: ${resolvedPath}`);
  } else {
    console.log(`Folder already exists at: ${resolvedPath}`);
  }
  const allowOrigin = config.originCors.split(",");

  try {
    const io = new Server(server, {
      cors: {
        methods: ["GET", "POST"],
        origin(requestOrigin, callback) {
          if (!requestOrigin || allowOrigin.includes(requestOrigin)) {
            callback(null, true);
          } else {
            callback(new Error("Origin not allowed by CORS"));
          }
        },
        credentials: true,
      },
    });

    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin || allowOrigin.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Origin not allowed by CORS"));
        }
      },
      credentials: true,
    };

    // app.set("trust proxy", true);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cors(corsOptions));
    app.use(multer().any());

    app.use(setupDI(io));

    app.use(
      session({
        name: "gameku_session",
        secret: config.secretSession,
        resave: false,
        saveUninitialized: true,
        cookie: {
          secure:
            process.env.NODE_ENV.toLowerCase() === "production" ? true : false,
          httpOnly: true,
          maxAge: config.maxAgeGuest * 1000,
        },
      })
    );

    app.use(createSessions);
    app.use(cookieParser());
    app.use(requestTime);
    app.use(webhook);
    app.use(router);
    app.use("*", (req: Request, res: Response) => {
      res.status(404);
      res.send({
        time: new Date(),
        message: "Cannot find path " + req.originalUrl,
        method: req.method,
      });
    });
  } catch (error) {
    console.error(error);
  }
};

export default getApp;
