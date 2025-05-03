import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  Scopes,
  DefaultScope,
  HasMany,
  HasOne,
  Default,
} from "sequelize-typescript";
import { OrderStatuses, OrderType } from "@enum/index";
import {
  CustomerEntity,
  InvoiceEntity,
  OrderDetailEntity,
  PaymentMethodEntity,
} from ".";

@DefaultScope(() => ({
  attributes: { exclude: ["amtBuy", "remark", "isError", "isCanResend"] },
}))
@Table({
  tableName: "orders",
  timestamps: true,
  underscored: true,
})
@Scopes(() => ({
  withAmtBuy: {
    attributes: { include: ["amtBuy"] },
  },
  logging: {
    attributes: { include: ["remark", "isError", "isCanResend"] },
  },
}))
export class OrderEntity extends Model<OrderEntity> {
  @PrimaryKey
  @Column(DataType.STRING(40))
  id!: string;

  @Column(DataType.STRING(40))
  invoiceId!: string;

  @Column(DataType.STRING(255))
  extTrxId?: string;

  @ForeignKey(() => CustomerEntity)
  @Column(DataType.STRING(40))
  customerId!: string;

  @ForeignKey(() => PaymentMethodEntity)
  @Column(DataType.STRING(40))
  paymentMethodId!: string;

  @Column(DataType.STRING(10))
  type: OrderType;

  @Column(DataType.STRING(255))
  game!: string;

  @Column(DataType.STRING(255))
  productName!: string;

  @Column(DataType.STRING(255))
  paymentMethod!: string;

  @Column(DataType.INTEGER)
  amtBuy!: number;

  @Column(DataType.INTEGER)
  totalAmt!: number;

  @Column(DataType.INTEGER)
  feeAmt!: number;

  @Column(DataType.INTEGER)
  discAmt!: number;

  @Column(DataType.STRING(255))
  status!: OrderStatuses;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  @Column(DataType.BOOLEAN)
  isError!: boolean;

  @Column(DataType.BOOLEAN)
  isCanResend!: boolean;

  @Column(DataType.STRING(255))
  remark!: string;

  @Column(DataType.STRING(255))
  ipAddress!: string;

  @Column(DataType.BOOLEAN)
  isNew!: boolean;

  @Column(DataType.INTEGER)
  countMessagePending!: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isSellerDigiflazz!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isGuest!: boolean;

  @Column(DataType.DATE)
  completedAt!: Date | string;

  @HasOne(() => OrderDetailEntity, "orderId")
  orderDetail!: OrderDetailEntity;

  @BelongsTo(() => InvoiceEntity, "invoiceId")
  invoice!: InvoiceEntity;

  @BelongsTo(() => CustomerEntity, "customerId")
  customer!: CustomerEntity;

  @BelongsTo(() => PaymentMethodEntity, "paymentMethodId")
  payment!: PaymentMethodEntity;
}
