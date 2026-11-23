import { Module } from '@nestjs/common';
import { TrasbordosController } from './trasbordos.controller';
import { TrasbordosService } from './trasbordos.service';

@Module({
  controllers: [TrasbordosController],
  providers: [TrasbordosService],
  exports: [TrasbordosService],
})
export class TrasbordosModule {}
