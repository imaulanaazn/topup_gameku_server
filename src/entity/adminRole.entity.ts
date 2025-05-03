import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from "sequelize-typescript";
import { AdminUserRoleEntity } from "./AdminUserRole";
@Table({
  tableName: "admin_roles",
  underscored: true,
  timestamps: true,
})
export class AdminRoleEntity extends Model<AdminRoleEntity> {
  @PrimaryKey
  @Column(DataType.STRING(40))
  id!: string;

  @Column(DataType.STRING(255))
  name!: string;

  @Column(DataType.STRING(255))
  cd!: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  @HasMany(() => AdminUserRoleEntity, "roleId")
  roles: AdminUserRoleEntity[];
}
