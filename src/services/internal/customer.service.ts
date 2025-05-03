import { MainService } from "./main.service";
import { CustomerDto } from "src/dtos/index";
import { CustomerEntity } from "@entity/index";
import { Config } from "@config/index";

export class CustomerService extends MainService<CustomerEntity, CustomerDto> {
  private config: Config;
  constructor() {
    super(CustomerEntity);
    const config = new Config();
    this.config = config;
  }

  async findUserWithPasswordBy<K extends keyof CustomerDto>(
    column: K,
    value: CustomerDto[K]
  ): Promise<CustomerEntity> {
    return await this.model
      .scope("withPassword")
      .scope("withRole")
      .findOne({
        where: {
          [column]: value,
          roleId: this.config.roleUser,
        },
      });
  }
}
