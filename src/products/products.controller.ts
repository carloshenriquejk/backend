import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginateProductsDto } from './dto/paginate-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

interface AuthRequest {
  user: { id: string; email: string; role: string };
}

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto, @Request() req: AuthRequest) {
    return this.productsService.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query() query: PaginateProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @Request() req: AuthRequest,
  ) {
    return this.productsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthRequest) {
    return this.productsService.remove(id, req.user.id);
  }
}
