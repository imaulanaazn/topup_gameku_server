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
}
