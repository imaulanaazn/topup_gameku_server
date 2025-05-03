import { ListServerDto } from "@dto/index";
import {
  ErrorType,
  ServerIdType,
  ValidatorType,
  VoucherType,
} from "@enum/index";
import { BusinessError } from "@helper/handleError";
import { Validator } from "@helper/validator";
import { IApiRouter, Validation } from "@interfaces/index";
import { GameService } from "@serviceInternal/game.service";
import { GameCategoryService } from "@serviceInternal/gameCategory.service";
import { ListServerService } from "@serviceInternal/listServer.service";
import { RequestHandler } from "express";
import { v4 as uuid } from "uuid";
import { APIAuth, APIMethod } from "@enum/index";

const path = "/v1/game";
const method = APIMethod.PUT;
const auth = APIAuth.ADMIN;

const schemaValidation: Validation[] = [
  {
    name: "id",
    type: "string",
    required: true,
  },
  {
    name: "name",
    type: "string",
    required: true,
  },
  {
    name: "type",
    type: "string",
    required: true,
  },
  {
    name: "slug",
    type: "string",
    required: true,
  },
  {
    name: "voucherType",
    type: "string",
    required: false,
  },
  {
    name: "needServerId",
    type: "string",
    required: false,
    enum: ["true", "false"],
  },
  {
    name: "typeServerId",
    type: "string",
    required: false,
  },
  {
    name: "categoryId",
    type: "string",
    required: true,
  },
  {
    name: "desc",
    type: "string",
    required: true,
  },
  {
    name: "keywords",
    type: "string",
    required: true,
  },
  {
    name: "listServerId",
    type: "string",
    required: true,
  },
  {
    name: "deleted",
    type: "string",
    required: false,
  },
];

const main: RequestHandler = async (req, res) => {
  const body = new Validator(req, res).process<{
    id: string;
    name: string;
    type: string;
    slug: string;
    voucherType?: VoucherType;
    needServerId?: string;
    typeServerId?: string;
    categoryId: string;
    desc: string;
    keywords: string;
    listServerId: string;
    deleted: boolean;
  }>(schemaValidation, ValidatorType.BODY);
  const file = req.files;

  const gameService = new GameService();
  const gameCategoryService = new GameCategoryService();

  const game = await gameService.findOneBy({
    column: "id",
    value: body.id,
  });

  if (!game) {
    throw new BusinessError("Game Tidak valid", ErrorType.BadRequest);
  }

  if (body.categoryId !== game.categoryId) {
    const gameCategory = await gameCategoryService.findOneBy({
      column: "id",
      value: body.categoryId,
    });

    if (!gameCategory) {
      throw new BusinessError(
        "Kategori Game tidak valid",
        ErrorType.BadRequest
      );
    }
  }

  const dataUpdate = {
    categoryId: body.categoryId,
    name: body.name,
    logoUrl: game.logoUrl,
    isPopular: game.isPopular,
    slug: body.slug,
    logoDenom: game.logoDenom,
    deleted: body.deleted || game.deleted,
    needServerId:
      (body.type === "topup" &&
        body.needServerId &&
        body.needServerId === "true") ||
      null,
    typeServerId: body.typeServerId
      ? ServerIdType[body.typeServerId.toUpperCase()]
      : game.typeServerId,
    type: body.type,
    voucherType: body.voucherType
      ? VoucherType[body.voucherType.toUpperCase()]
      : game.voucherType,
    description: body.desc,
  };

  let dataBulk: ListServerDto[] = [];
  if (body.needServerId && body.typeServerId === "list" && body.listServerId) {
    const listServerService = new ListServerService();
    const listServer = await listServerService.findManyBy({
      column: "gameId",
      value: game.id,
    });

    if (listServer.length > 0) {
      await listServerService.model.destroy({
        where: {
          gameId: game.id,
        },
      });
    }

    for (const data of JSON.parse(body.listServerId)) {
      dataBulk.push({
        id: uuid(),
        gameId: game.id,
        label: data.label,
        value: data.value,
      });
    }
    await listServerService.model.bulkCreate(dataBulk);
  }

  await gameService.updateBy({
    by: "id",
    value: body.id,
    data: dataUpdate,
  });

  // const clearDesc = body.desc.replace(/<[^>]+>/g, " ");
  // const metaService = new MetaService();
  // await metaService.updateBy({
  //     by: "slug",
  //     value: game.slug,
  //     data: {
  //         path: `/${dataUpdate.slug}`,
  //         slug: dataUpdate.slug,
  //         title: dataUpdate.name,
  //         icon: uploadLogoUrl || game.logoUrl,
  //         image: uploadLogoUrl || game.logoUrl,
  //         description: clearDesc,
  //         keywords: body.keywords,
  //     },
  // });

  res.send({
    id: game.id,
    ...dataUpdate,
    ...(body.needServerId &&
      body.typeServerId === "list" &&
      body.listServerId && { listServer: dataBulk }),
    createdAt: game.createdAt,
  });
};

export const putGame: IApiRouter = {
  path,
  method,
  main,
  auth,
  isUploadImage: true,
  dataImg: {
    single: false,
    field: ["logoUrl", "logoDenom"],
  },
};
