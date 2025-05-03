import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  Unique,
  AllowNull,
  ForeignKey,
  BelongsTo,
  HasMany,
} from "sequelize-typescript";
import { GameCategoryEntity } from "./gameCategory.entity";
import { ServerIdType, VoucherType } from "@enum/index";
import { ProviderEntity } from "./provider.entity";
import { ProductEntity } from "./product.entity";

@Table({
  tableName: "games",
  timestamps: true,
  underscored: true,
})
export class GameEntity extends Model<GameEntity> {
  @PrimaryKey
  @Column(DataType.STRING(40))
  id!: string;

  @ForeignKey(() => ProviderEntity)
  @Column(DataType.STRING(40))
  provider!: string;

  @ForeignKey(() => GameCategoryEntity)
  @Column(DataType.STRING(40))
  categoryId!: string;

  @Column(DataType.STRING(40))
  name!: string;

  @Column(DataType.STRING(255))
  cd!: string;

  @Column(DataType.BOOLEAN)
  automatically!: boolean;

  @Column(DataType.STRING(255))
  type!: string;

  @Column(DataType.STRING(255))
  voucherType!: VoucherType;

  @Column(DataType.BOOLEAN)
  needCheckId!: boolean;

  @Column(DataType.BOOLEAN)
  needServerId!: boolean;

  @Column(DataType.STRING(255))
  typeServerId!: ServerIdType;

  @Column(DataType.STRING(255))
  logoUrl: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isPopular: boolean;

  @Default(false)
  @Column(DataType.INTEGER)
  popSequence: number;

  @Unique(true)
  @Column(DataType.STRING(255))
  slug: string;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.STRING(255))
  logoDenom: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  @Default(false)
  @Column(DataType.BOOLEAN)
  deleted!: boolean;

  @HasMany(() => ProductEntity, "gameId")
  products!: ProductEntity[];

  @BelongsTo(() => GameCategoryEntity, "categoryId")
  gameCategory!: GameCategoryEntity;

  @BelongsTo(() => ProviderEntity, "provider")
  gameProvider!: ProviderEntity;
}
