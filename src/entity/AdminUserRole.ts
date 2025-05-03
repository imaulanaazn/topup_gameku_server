import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  HasMany,
  BelongsTo,
  ForeignKey,
} from "sequelize-typescript";
import { AdminEntity } from "./admin.entity";
import { AdminRoleEntity } from "./adminRole.entity";

@Table({
  tableName: "admin_user_roles",
  underscored: true,
  timestamps: true,
})
export class AdminUserRoleEntity extends Model<AdminUserRoleEntity> {
  @PrimaryKey
  @Column(DataType.STRING(40))
  id!: string;

  @ForeignKey(() => AdminEntity)
  @Column(DataType.STRING(40))
  userId!: string;

  @ForeignKey(() => AdminRoleEntity)
  @Column(DataType.STRING(40))
  roleId!: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  @BelongsTo(() => AdminEntity, "userId")
  admin: AdminEntity;

  @BelongsTo(() => AdminRoleEntity, "roleId")
  role: AdminRoleEntity;
}
