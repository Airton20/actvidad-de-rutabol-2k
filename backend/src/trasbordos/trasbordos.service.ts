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

    const mOrigen = await this.db.query<{ id: number; interno: string; capacidad: number; pasajeros_actuales: number }>(
      'SELECT id, interno, capacidad, pasajeros_actuales FROM micros WHERE id = $1',
      [dto.microOrigenId]
    );
    if (!mOrigen[0]) throw new NotFoundException('Micro de origen no encontrado');

    const mDestino = await this.db.query<{ id: number; interno: string; capacidad: number; pasajeros_actuales: number }>(
      'SELECT id, interno, capacidad, pasajeros_actuales FROM micros WHERE id = $1',
      [dto.microDestinoId]
    );
    if (!mDestino[0]) throw new NotFoundException('Micro de destino no encontrado');

    const origen = mOrigen[0];
    const destino = mDestino[0];
    const cantidad = dto.cantidadPasajeros ?? origen.pasajeros_actuales;

    if (destino.pasajeros_actuales + cantidad > destino.capacidad) {
      throw new BadRequestException(
        `El micro de destino (Interno ${destino.interno}) no tiene suficiente capacidad para recibir ${cantidad} pasajeros`
      );
    }

    await this.db.query('UPDATE micros SET pasajeros_actuales = GREATEST(0, pasajeros_actuales - $1) WHERE id = $2', [cantidad, origen.id]);
    await this.db.query('UPDATE micros SET pasajeros_actuales = pasajeros_actuales + $1 WHERE id = $2', [cantidad, destino.id]);

    if (dto.motivo === 'FALLA_MECANICA' || dto.motivo === 'EMERGENCIA') {
      await this.db.query("UPDATE micros SET estado = 'EMERGENCIA' WHERE id = $1", [origen.id]);
    }

    const rows = await this.db.query<Trasbordo>(
      `INSERT INTO trasbordos (micro_origen_id, micro_destino_id, motivo, cantidad_pasajeros, estado)
       VALUES ($1, $2, $3, $4, 'COMPLETADO')
       RETURNING id, micro_origen_id AS "microOrigenId", micro_destino_id AS "microDestinoId",
                 motivo, cantidad_pasajeros AS "cantidadPasajeros", estado, fecha`,
      [origen.id, destino.id, dto.motivo, cantidad]
    );

    await this.db.query(
      `INSERT INTO notificaciones (micro_id, titulo, mensaje, tipo)
       VALUES ($1, $2, $3, 'TRASBORDO')`,
      [
        destino.id,
        `Trasbordo (${dto.motivo})`,
        `Se han transferido ${cantidad} pasajeros del interno ${origen.interno} al interno ${destino.interno}. Los boletos siguen vigentes sin costo adicional.`
      ]
    );

    return rows[0];
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
