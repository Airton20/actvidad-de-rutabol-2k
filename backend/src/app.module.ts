import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { LineasModule } from './lineas/lineas.module';
import { MicrosModule } from './micros/micros.module';
import { AuthModule } from './auth/auth.module';
import { TarifasModule } from './tarifas/tarifas.module';
import { PagosModule } from './pagos/pagos.module';
import { TrasbordosModule } from './trasbordos/trasbordos.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';

@Module({
  imports: [
    DatabaseModule,
    LineasModule,
    MicrosModule,
    AuthModule,
    TarifasModule,
    PagosModule,
    TrasbordosModule,
    NotificacionesModule,
  ],
})
export class AppModule {}
