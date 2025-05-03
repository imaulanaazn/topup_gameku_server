import { RequestHandler } from "express";
import { IApiRouter, Validation } from "@interfaces/index";
import { Validator } from "@helper/validator";
import { ErrorType, ServerIdType, ValidatorType } from "@enum/index";
import { BusinessError } from "@helper/handleError";
import { ProductService } from "@serviceInternal/product.service";
import { GameService } from "@serviceInternal/game.service";
import { ListServerService } from "@serviceInternal/listServer.service";
import { ProductEntity } from "@entity/product.entity";
import { Op } from "sequelize";
import { APIAuth, APIMethod } from "@enum/index";

const path = "/v1/game-detail";
const method = APIMethod.GET;
const auth = APIAuth.GUEST;

const schemaValidation: Validation[] = [
  {
    name: "id",
    type: "string",
    required: false,
  },
  {
    name: "slug",
    type: "string",
    required: false,
  },
  {
    name: "deleted",
    type: "boolean",
    required: false,
  },
];

const main: RequestHandler = async (req, res) => {
  const query = new Validator(req, res).process<{
    id: string;
    slug: string;
    deleted: boolean;
  }>(schemaValidation, ValidatorType.QUERY);

  if (!query.id && !query.slug) {
    throw new BusinessError(
      "Setidaknya query param harus ada salah satu dari game id atau game slug",
      ErrorType.Validation
    );
  }

  const gameService = new GameService();
  const game = await gameService.model.findOne({
    where: {
      ...(query.id ? { id: query.id } : { slug: query.slug }),
    },
    attributes: [
      "id",
      "categoryId",
      "name",
      "type",
      "needServerId",
      "typeServerId",
      "logoUrl",
      "description",
      "deleted",
    ],
  });

  if (!game) {
    throw new BusinessError(
      `Game tidak ditemukan dengan id: ${query.id}`,
      ErrorType.NotFound
    );
  }

  let isGrouped = false;

  const productService = new ProductService();
  const products = await productService.model.findAll({
    where: {
      gameId: game.id,
      deleted: false,
      isActive: true,
      isDisplayed: true,
      categoryId: {
        [Op.in]: ["", null],
      },
    },
    attributes: ["id", "name", "price", "logoDenom"],
  });

  const listServerService = new ListServerService();
  let listServers;
  if (game.needServerId && game.typeServerId === ServerIdType.LIST) {
    listServers = await listServerService.model.findAll({
      where: {
        gameId: game.id,
      },
    });
  }

  return res.send({
    ...game.dataValues,
    listServer: listServers,
    isGrouped,
    products: products.sort((a, b) => a.price - b.price),
    denoms: products.sort((a, b) => a.price - b.price),
    servers: listServers,
  });
};

export const getGameDetailById: IApiRouter = {
  main,
  path,
  method,
  auth,
};
