import { MainService } from "./main.service";
import { GameCategoryDto } from "src/dtos/index";
import { GameCategoryEntity, GameEntity } from "@entity/index";
import { col } from "sequelize";

export class GameCategoryService extends MainService<
  GameCategoryEntity,
  GameCategoryDto
> {
  constructor() {
    super(GameCategoryEntity);
  }
}
