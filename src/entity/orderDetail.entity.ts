import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasOne,
} from "sequelize-typescript";
import { OrderEntity, ProductEntity } from ".";

@Table({
  tableName: "orders_detail",
  timestamps: false,
  underscored: true,
})
export class OrderDetailEntity extends Model<OrderDetailEntity> {
  @PrimaryKey
  @Column(DataType.STRING(40))
  id!: string;

  @ForeignKey(() => OrderEntity)
  @Column(DataType.STRING(40))
  orderId!: string;

  @ForeignKey(() => ProductEntity)
  @Column(DataType.STRING(40))
  productId!: string;

  @Column(DataType.STRING(255))
  userId!: string;

  @Column(DataType.STRING(255))
  serverId!: string;

  @Column(DataType.INTEGER)
  amount!: number;

  @Column(DataType.INTEGER)
  quantity!: number;

  @Column(DataType.INTEGER)
  webhookCount!: number;

  @Column(DataType.STRING(255))
  username!: string;

  @BelongsTo(() => OrderEntity, "orderId")
  order!: OrderEntity;

  @BelongsTo(() => ProductEntity, "productId")
  product!: ProductEntity;
}
