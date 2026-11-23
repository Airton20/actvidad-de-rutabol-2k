import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Notificacion } from './notificacion.interface';

@Injectable()
export class NotificacionesService {
  constructor(private readonly db: DatabaseService) { }

  async findAll(): Promise<Notificacion[]> {
    return this.db.query<Notificacion>(
      `SELECT id, usuario_id AS "usuarioId", micro_id AS "microId",
              titulo, mensaje, tipo, leido, fecha
       FROM notificaciones
       ORDER BY fecha DESC
       LIMIT 50`
    );
  }

  async marcarLeida(id: number): Promise<void> {
    await this.db.query('UPDATE notificaciones SET leido = TRUE WHERE id = $1', [id]);
  }
}
