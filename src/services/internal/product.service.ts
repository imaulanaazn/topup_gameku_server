import { MainService } from "./main.service";
import { ProductDto } from "src/dtos/index";
import { ProductEntity } from "@entity/index";

export class ProductService extends MainService<ProductEntity, ProductDto> {
  constructor() {
    super(ProductEntity);
  }
}
