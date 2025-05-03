import { RequestHandler } from "express";
import { IApiRouter, Validation } from "@interfaces/index";
import { Validator } from "@helper/validator";
import { APIAuth, APIMethod, ErrorType, ValidatorType } from "@enum/index";
import { GameService } from "@serviceInternal/game.service";
import { GameCategoryService } from "@serviceInternal/gameCategory.service";
import { BusinessError } from "@helper/handleError";
import { Op, col, fn } from "sequelize";
import { GameDto } from "@dto/game.dto";

const path = "/v1/games";
const method = APIMethod.GET;
const auth = APIAuth.GUEST;

const schemaValidation: Validation[] = [
  {
    name: "categoryId",
    type: "string",
    required: false,
  },
  {
    name: "isPopular",
    type: "string",
    default: "false",
    required: false,
    enum: ["true", "false"],
  },
  {
    name: "search",
    type: "string",
    required: false,
  },
  {
    name: "distinct",
    type: "string",
    required: false,
  },
];

const main: RequestHandler = async (req, res) => {
  const di = req.di;
  const query = new Validator(req, res).process<{
    categoryId?: string;
    isPopular?: "true" | "false";
    search?: string;
    distinct?: "true" | "false";
  }>(schemaValidation, ValidatorType.QUERY);

  const gameService = new GameService();
  const gameCategoryService = new GameCategoryService();
  let redisKey = "games";
  if (query.isPopular === "true") {
    redisKey += ":isPopular";
    const gamePopularFromRedis = await di.redisService.getObject<GameDto[]>(
      redisKey
    );
    if (gamePopularFromRedis && gamePopularFromRedis.length > 0) {
      const filteredGames = query.search
        ? gamePopularFromRedis.filter((item) =>
            new RegExp(query.search, "i").test(item.name)
          )
        : gamePopularFromRedis;

      return res.send(
        filteredGames.sort((a, b) => a.popSequence - b.popSequence)
      );
    }

    const games = await gameService.model.findAll({
      where: {
        isPopular: true,
        deleted: false,
        ...(query.search
          ? {
              name: {
                [Op.like]: "%" + query.search + "%",
              },
            }
          : {}),
      },
      order: [["popSequence", "ASC"]],
    });

    if (!query.search) {
      await di.redisService.setObject(redisKey, games);
    }

    return res.send(games);
  }

  if (query.categoryId) {
    const category = await gameCategoryService.findOneBy({
      column: "id",
      value: query.categoryId,
    });

    if (!category) {
      throw new BusinessError(
        "Game Category ID tidak valid: " + query.categoryId,
        ErrorType.NotFound
      );
    }

    redisKey += `:category:${category.id}`;
    const gamesFromRedis = await di.redisService.getObject<GameDto[]>(redisKey);
    if (gamesFromRedis && gamesFromRedis.length > 0) {
      const filteredGames = query.search
        ? gamesFromRedis.filter((item) =>
            new RegExp(query.search, "i").test(item.name)
          )
        : gamesFromRedis;

      return res.send(
        filteredGames.sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    const games = await gameService.model.findAll({
      where: {
        categoryId: query.categoryId,
        deleted: false,
        ...(query.search
          ? {
              name: {
                [Op.like]: "%" + query.search + "%",
              },
            }
          : {}),
      },
      order: [["name", "ASC"]],
    });

    if (!query.search) {
      await di.redisService.setObject(redisKey, games);
    }

    return res.send(games);
  }

  if (query.distinct) {
    redisKey += `:distinct`;
    const gamesFromRedis = await di.redisService.getObject<GameDto[]>(redisKey);
    if (gamesFromRedis && gamesFromRedis.length > 0) {
      const filteredGames = gamesFromRedis.filter((item) =>
        new RegExp(query.search, "i").test(item.name)
      );
      return res.send(
        filteredGames.sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    const games = await gameService.model.findAll({
      attributes: ["id", "name"],
      where: {
        deleted: false,
      },
    });

    const newGames = games.sort((a, b) => a.name.localeCompare(b.name));
    return res.send(newGames);
  }

  redisKey += `:all`;
  const gamesFromRedis = await di.redisService.getObject<GameDto[]>(redisKey);
  if (gamesFromRedis && gamesFromRedis.length > 0) {
    console.log("Games from redis all");
    const filteredGames = gamesFromRedis.filter((item) =>
      new RegExp(query.search, "i").test(item.name)
    );
    return res.send(filteredGames.sort((a, b) => a.name.localeCompare(b.name)));
  }

  const games = await gameService.model.findAll({
    where: {
      deleted: false,
      ...(query.search
        ? {
            name: {
              [Op.like]: "%" + query.search + "%",
            },
          }
        : {}),
    },
  });

  if (!query.search) {
    await di.redisService.setObject(redisKey, games);
  }

  return res.send(games);
};

export const getGameByCategory: IApiRouter = {
  path,
  method,
  main,
  auth,
};
