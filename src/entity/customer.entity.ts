import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  DefaultScope,
  Scopes,
  Unique,
} from "sequelize-typescript";

@DefaultScope(() => ({
  attributes: { exclude: ["password", "roleId"] },
}))
@Scopes(() => ({
  withPassword: {
    attributes: { include: ["password"] },
  },
  withRole: {
    attributes: { include: ["roleId"] },
  },
}))
@Table({
  tableName: "customers",
  timestamps: true,
  underscored: true,
})
export class CustomerEntity extends Model<CustomerEntity> {
  @PrimaryKey
  @Column(DataType.STRING(40))
  id!: string;

  @Column(DataType.STRING(10))
  roleId!: string;

  @Column(DataType.STRING(40))
  status!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isRegistered!: boolean;

  @Column(DataType.STRING(255))
  name!: string;

  @Column(DataType.STRING(255))
  image!: string;

  @Column(DataType.STRING(255))
  email!: string;

  @Unique(true)
  @Column(DataType.STRING(255))
  mobileNumber!: string;

  @Unique(true)
  @Column(DataType.STRING(255))
  telegramId: string;

  @Column(DataType.STRING(255))
  password!: string;

  @Column(DataType.INTEGER)
  loginAttemps!: number;

  @Column(DataType.DATE)
  lockUntil!: Date;

  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}
