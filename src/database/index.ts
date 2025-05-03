import { Sequelize } from "sequelize-typescript";
import { Config } from "../config";
import {
  AdminEntity,
  AdminRoleEntity,
  CustomerEntity,
  GameCategoryEntity,
  GameEntity,
  InvoiceEntity,
  ListServerEntity,
  OrderDetailEntity,
  OrderEntity,
  OrderPending3rdPartyEntity,
  PaymentMethodEntity,
  ProductEntity,
  ProviderEntity,
  SysConfigEntity,
  AdminUserRoleEntity,
} from "@entity/index";

const config = new Config();

const sequelize = new Sequelize({
  host: config.databaseHost,
  database: config.databaseName,
  username: config.databaseUsername,
  password: config.databasePassword,
  port: config.databasePort,
  logQueryParameters: false,
  logging: false,
  dialect: "mysql",
  models: [
    CustomerEntity,
    GameEntity,
    OrderEntity,
    PaymentMethodEntity,
    ProductEntity,
    InvoiceEntity,
    OrderDetailEntity,
    GameCategoryEntity,
    ListServerEntity,
    SysConfigEntity,
    AdminEntity,
    ProviderEntity,
    OrderPending3rdPartyEntity,
    AdminUserRoleEntity,
    AdminRoleEntity,
  ],
});

sequelize
  .authenticate()
  .then(() => {
    console.log("Berhasil mengkoneksikan ke database");
  })
  .catch((err) => {
    console.error(err.message);
  });

export default sequelize;
