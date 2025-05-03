import { ServerIdType } from "@enum/index";
import { sleep } from "@helper/index";
import { IApiRouter } from "@interfaces/index";
import { GameService } from "@serviceInternal/game.service";
import { RequestHandler } from "express";
import { APIAuth, APIMethod } from "@enum/index";

const path = "/v1/sync-desc-topupgameku";
const method = APIMethod.GET;
const auth = APIAuth.GUEST;
const main: RequestHandler = async (req, res) => {
  const gameService = new GameService();
  const games = await gameService.findAll();
  for (const game of games) {
    let desc = `<p>Cara Top Up ${game.name} di Topup Gameku :</p>\n<p><br /></p>`;

    if (game.type === "topup") {
      desc += `\n<p>1. Masukan User ID`;
      if (game.needServerId && game.typeServerId === ServerIdType.LIST) {
        desc += ` dan pilih Server ID</p>`;
      } else if (game.needServerId) {
        desc += ` dan server ID</p>`;
      } else {
        desc += `</p>`;
      }
    }

    desc += `\n<p>${
      game.type === "topup" ? "2" : "1"
    }. Selesaikan pembayaran</p>`;

    if (game.type === "topup") {
      desc += `\n<p>4. Denom akan ditambahkan ke akun ${game.name} kamu</p>`;
    } else {
      desc += `\n<p>3. Voucher akan dikirim</p>`;
    }

    desc += `<p>\n<br /></p>`;
    desc += `<p>\nLayanan 24 jam</p>`;

    await gameService.updateBy({
      by: "id",
      value: game.id,
      data: {
        description: desc,
      },
    });

    await sleep(500);
  }

  res.sendStatus(200);
};

export const syncLapakgamingDataDesc: IApiRouter = {
  method,
  path,
  auth,
  main,
};
