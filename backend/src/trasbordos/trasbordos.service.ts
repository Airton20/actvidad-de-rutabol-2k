import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTrasbordoDto } from './dto/create-trasbordo.dto';
import { Trasbordo } from './trasbordo.interface';

@Injectable()
export class TrasbordosService {
  constructor(private readonly db: DatabaseService) {}

  async crear(dto: CreateTrasbordoDto): Promise<Trasbordo> {
    if (dto.microOrigenId === dto.microDestinoId) {
      throw new BadRequestException('El micro de origen y destino no pueden ser el mismo');
    }

    return this.db.withTransaction(async (query) => {
      const [firstId, secondId] = [dto.microOrigenId, dto.microDestinoId].sort((a, b) => a - b);
      const locked = await query<{ id: number; interno: string; capacidad: number; pasajeros_actuales: number }>(
        'SELECT id, interno, capacidad, pasajeros_actuales FROM micros WHERE id IN ($1, $2) ORDER BY id FOR UPDATE',
        [firstId, secondId]
      );

      const origen = locked.find((m) => m.id === dto.microOrigenId);
      const destino = locked.find((m) => m.id === dto.microDestinoId);
      if (!origen) throw new NotFoundException('Micro de origen no encontrado');
      if (!destino) throw new NotFoundException('Micro de destino no encontrado');

      const cantidad = dto.cantidadPasajeros ?? origen.pasajeros_actuales;

      if (destino.pasajeros_actuales + cantidad > destino.capacidad) {
        throw new BadRequestException(
          `El micro de destino (Interno ${destino.interno}) no tiene suficiente capacidad para recibir ${cantidad} pasajeros`
        );
      }

      await query(
        'UPDATE micros SET pasajeros_actuales = GREATEST(0, pasajeros_actuales - $1) WHERE id = $2',
        [cantidad, origen.id]
      );
      const destinoClaim = await query<{ id: number }>(
        'UPDATE micros SET pasajeros_actuales = pasajeros_actuales + $1 WHERE id = $2 AND pasajeros_actuales + $1 <= capacidad RETURNING id',
        [cantidad, destino.id]
      );
      if (!destinoClaim[0]) {
        throw new BadRequestException(
          `El micro de destino (Interno ${destino.interno}) no tiene suficiente capacidad para recibir ${cantidad} pasajeros`
        );
      }

      if (dto.motivo === 'FALLA_MECANICA' || dto.motivo === 'EMERGENCIA') {
        await query("UPDATE micros SET estado = 'EMERGENCIA' WHERE id = $1", [origen.id]);
      }

      const rows = await query<Trasbordo>(
        `INSERT INTO trasbordos (micro_origen_id, micro_destino_id, motivo, cantidad_pasajeros, estado)
         VALUES ($1, $2, $3, $4, 'COMPLETADO')
         RETURNING id, micro_origen_id AS "microOrigenId", micro_destino_id AS "microDestinoId",
                   motivo, cantidad_pasajeros AS "cantidadPasajeros", estado, fecha`,
        [origen.id, destino.id, dto.motivo, cantidad]
      );

      await query(
        `INSERT INTO notificaciones (micro_id, titulo, mensaje, tipo)
         VALUES ($1, $2, $3, 'TRASBORDO')`,
        [
          destino.id,
          `Trasbordo (${dto.motivo})`,
          `Se han transferido ${cantidad} pasajeros del interno ${origen.interno} al interno ${destino.interno}. Los boletos siguen vigentes sin costo adicional.`
        ]
      );

      return rows[0];
    });
  }

  async findAll(): Promise<Trasbordo[]> {
    return this.db.query<Trasbordo>(
      `SELECT t.id, t.micro_origen_id AS "microOrigenId", t.micro_destino_id AS "microDestinoId",
              t.motivo, t.cantidad_pasajeros AS "cantidadPasajeros", t.estado, t.fecha,
              m1.interno AS "microOrigenInterno", m2.interno AS "microDestinoInterno"
       FROM trasbordos t
       JOIN micros m1 ON m1.id = t.micro_origen_id
       JOIN micros m2 ON m2.id = t.micro_destino_id
       ORDER BY t.fecha DESC`
    );
  }
}
