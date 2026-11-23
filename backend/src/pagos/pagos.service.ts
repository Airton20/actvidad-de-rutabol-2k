import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { Pago } from './pago.interface';

@Injectable()
export class PagosService {
  constructor(private readonly db: DatabaseService) { }

  async procesarPago(usuarioId: number, dto: ProcesarPagoDto): Promise<Pago> {
    const micros = await this.db.query<{ id: number; capacidad: number; pasajeros_actuales: number }>(
      'SELECT id, capacidad, pasajeros_actuales FROM micros WHERE id = $1',
      [dto.microId]
    );
    if (!micros[0]) throw new NotFoundException('El micro indicado no existe');
    const micro = micros[0];
    if (micro.pasajeros_actuales >= micro.capacidad) {
      throw new BadRequestException('El micro está en su capacidad máxima autorizada');
    }

    const usuarios = await this.db.query<{ categoria: string; estudiante_validado: boolean }>(
      'SELECT categoria, estudiante_validado FROM usuarios WHERE id = $1',
      [usuarioId]
    );
    const usuario = usuarios[0] || { categoria: 'GENERAL', estudiante_validado: false };

    const trasbordosRecientes = await this.db.query<{ id: number }>(
      `SELECT t.id FROM trasbordos t
       JOIN pagos p ON (p.micro_id = t.micro_origen_id AND p.usuario_id = $1)
       WHERE t.micro_destino_id = $2
         AND p.fecha_pago >= NOW() - INTERVAL '2 hours'
       ORDER BY t.id DESC LIMIT 1`,
      [usuarioId, dto.microId]
    );

    let monto = 2.00;
    let esTrasbordoGratuito = false;

    if (trasbordosRecientes.length > 0) {
      monto = 0.00;
      esTrasbordoGratuito = true;
    } else {
      let cat = usuario.categoria;
      if ((cat === 'UNIVERSITARIO' || cat === 'ESCOLAR') && !usuario.estudiante_validado) {
        cat = 'GENERAL';
      }
      const tarifas = await this.db.query<{ monto: number }>(
        'SELECT monto::float AS monto FROM tarifas WHERE categoria = $1',
        [cat]
      );
      if (tarifas[0]) monto = tarifas[0].monto;
    }

    const ultimos4 = dto.numeroTarjeta.slice(-4);
    const codigoTicket = `TCK-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const rows = await this.db.query<Pago>(
      `INSERT INTO pagos (usuario_id, micro_id, monto, metodo, codigo_ticket, estado, es_trasbordo_gratuito)
       VALUES ($1, $2, $3, $4, $5, 'EXITOSO', $6)
       RETURNING id, usuario_id AS "usuarioId", micro_id AS "microId", monto::float AS monto,
                 metodo, codigo_ticket AS "codigoTicket", estado,
                 es_trasbordo_gratuito AS "esTrasbordoGratuito", fecha_pago AS "fechaPago"`,
      [usuarioId, dto.microId, monto, `TARJETA_CREDITO (**** ${ultimos4})`, codigoTicket, esTrasbordoGratuito]
    );

    await this.db.query(
      'UPDATE micros SET pasajeros_actuales = pasajeros_actuales + 1 WHERE id = $1',
      [dto.microId]
    );

    return rows[0];
  }

  async historialUsuario(usuarioId: number): Promise<Pago[]> {
    return this.db.query<Pago>(
      `SELECT p.id, p.monto::float AS monto, p.metodo, p.codigo_ticket AS "codigoTicket",
              p.estado, p.es_trasbordo_gratuito AS "esTrasbordoGratuito", p.fecha_pago AS "fechaPago",
              m.interno AS "microInterno", m.placa AS "microPlaca", l.nombre AS "lineaNombre"
       FROM pagos p
       JOIN micros m ON m.id = p.micro_id
       JOIN lineas l ON l.id = m.linea_id
       WHERE p.usuario_id = $1
       ORDER BY p.fecha_pago DESC`,
      [usuarioId]
    );
  }

  async verificarTicket(codigoTicket: string): Promise<any> {
    const rows = await this.db.query(
      `SELECT p.id, p.codigo_ticket AS "codigoTicket", p.monto::float AS monto,
              p.es_trasbordo_gratuito AS "esTrasbordoGratuito", p.fecha_pago AS "fechaPago",
              u.nombre_completo AS "pasajeroNombre", u.categoria,
              m.interno AS "microInterno", l.nombre AS "lineaNombre"
       FROM pagos p
       JOIN usuarios u ON u.id = p.usuario_id
       JOIN micros m ON m.id = p.micro_id
       JOIN lineas l ON l.id = m.linea_id
       WHERE p.codigo_ticket = $1`,
      [codigoTicket.trim()]
    );
    if (!rows[0]) throw new NotFoundException('Ticket o boleto no encontrado');
    return { valido: true, detalle: rows[0] };
  }
}
