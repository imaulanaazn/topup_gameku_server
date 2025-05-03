import { GameDto } from "@dto/game.dto";
import { GameCategoryEntity } from "@entity/gameCategory.entity";
import { ListServerEntity } from "@entity/index";
import { APIAuth, APIMethod, ValidatorType } from "@enum/index";
import { Validator } from "@helper/validator";
import { IApiRouter, Validation } from "@interfaces/index";
import { GameService } from "@serviceInternal/game.service";
import { GameCategoryService } from "@serviceInternal/gameCategory.service";
import { ListServerService } from "@serviceInternal/listServer.service";
import { RequestHandler } from "express";
import { Op, Order } from "sequelize";

const path = "/v1/game";
const method = APIMethod.GET;
const auth = APIAuth.ADMIN;

const schemaValidation: Validation[] = [
  {
    name: "name",
    type: "string",
    required: false,
  },
  {
    name: "categoryId",
    type: "string",
    required: false,
  },
  {
    name: "type",
    type: "string",
    required: false,
  },
  {
    name: "isPopular",
    type: "string",
    required: false,
    enum: ["true", "false"],
  },
];

const main: RequestHandler = async (req, res) => {
  const query = new Validator(req, res).process<{
    name?: string;
    categoryId: string;
    type?: string;
    isPopular?: string;
  }>(schemaValidation, ValidatorType.QUERY, true);
  const clearQuery = JSON.parse(JSON.stringify(query));
  delete clearQuery.isPopular;
  delete clearQuery.page;
  delete clearQuery.sort;
  delete clearQuery.order;
  delete clearQuery.limit;

  const gameService = new GameService();
  const gameCategoryService = new GameCategoryService();
  const column = Object.keys(query);

  let where: any = {};
  if (column.length > 4) {
    if (query.isPopular) {
      where.isPopular = query.isPopular === "true";
    }

    for (const key of Object.keys(clearQuery)) {
      where[key] = { [Op.like]: `%${clearQuery[key]}%` };
    }
  }

  const order: Order =
    query.sort === "categoryName"
      ? [
          [
            { model: GameCategoryEntity, as: "gameCategory" },
            "name",
            query.order,
          ],
        ]
      : [[query.sort, query.order]];

  const game = await gameService.model.findAndCountAll({
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    include: [
      {
        model: GameCategoryEntity,
        as: "gameCategory",
        required: true,
      },
    ],
    order,
    where: {
      ...where,
      // deleted: false,
    },
  });

  const gameCategId = game.rows.map((game) => game.categoryId);
  const gameCategory = await gameCategoryService.findManyBy({
    column: "id",
    value: gameCategId,
    operator: "in",
  });

  const listServerService = new ListServerService();
  const listServer = await listServerService.findManyBy({
    column: "gameId",
    value: game.rows.map((item) => item.id),
    operator: "in",
  });

  const newData = [];
  for (const g of game.rows) {
    const category = gameCategory.find((categ) => categ.id === g.categoryId);
    const server = listServer.filter((item) => item.gameId === g.id);
    if (category) {
      //@ts-ignore
      newData.push({
        ...g.dataValues,
        categoryName: category.name,
        keywords: "[]",
        ...(server && { listServer: server }),
      });
    }
  }

  return res.send({
    data: newData,
    page: query.page,
    total: game.count,
    totalPage: Math.ceil(game.count / query.limit),
    order: query.order,
    sort: query.sort,
    limit: query.limit,
  });
};

export const getAllGamePagination: IApiRouter = {
  main,
  path,
  method,
  auth,
};
