import { CustomerStatuses } from "@enum/index";
import { MainDto } from "./main.dto";

export class CustomerDto extends MainDto {
  status: CustomerStatuses;
  roleId: string;
  isRegistered: boolean;
  name?: string;
  image?: string;
  email?: string;
  mobileNumber: string;
  telegramId?: string;
  password?: string;
  isActive: boolean;
  loginAttemps: number;
  lockUntil: Date;
}
