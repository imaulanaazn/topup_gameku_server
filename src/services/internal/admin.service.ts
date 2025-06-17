import { MainService } from "./main.service";
import { AdminDto } from "src/dtos/index";
import { AdminEntity } from "@entity/index";

export class AdminService extends MainService<AdminEntity, AdminDto> {
  constructor() {
    super(AdminEntity);
  }
}
