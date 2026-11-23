import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LineasService } from '../lineas/lineas.service';
import { CreateMicroDto } from './dto/create-micro.dto';
import { UpdateMicroDto } from './dto/update-micro.dto';
import { ActualizarPasajerosDto } from './dto/actualizar-pasajeros.dto';
import { ActualizarUbicacionDto } from './dto/actualizar-ubicacion.dto';
import { Micro } from './micro.interface';

const COLUMNAS = `
  id, placa, interno, capacidad,
  pasajeros_actuales AS "pasajerosActuales",
  estado, linea_id AS "lineaId",
  latitud, longitud,
  ultima_actualizacion_geo AS "ultimaActualizacionGeo"
`;

@Injectable()
export class MicrosService {
  constructor(private readonly db: DatabaseService, private readonly lineas: LineasService) {}

  findAll(): Promise<Micro[]> {
    return this.db.query<Micro>(`SELECT ${COLUMNAS} FROM micros ORDER BY id`);
  }

  async findOne(id: number): Promise<Micro> {
    const rows = await this.db.query<Micro>(`SELECT ${COLUMNAS} FROM micros WHERE id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('El micro no existe');
    return rows[0];
  }

  async findCercanos(lat: number, lng: number, radioKm = 5): Promise<Micro[]> {
    const sql = `
      SELECT ${COLUMNAS},
        ROUND((6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($1)) * cos(radians(latitud)) *
            cos(radians(longitud) - radians($2)) +
            sin(radians($1)) * sin(radians(latitud))
          ))
        ))::numeric, 2) AS "distanciaKm"
      FROM micros
      WHERE estado = 'ACTIVO'
        AND (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($1)) * cos(radians(latitud)) *
            cos(radians(longitud) - radians($2)) +
            sin(radians($1)) * sin(radians(latitud))
          ))
        )) <= $3
      ORDER BY "distanciaKm" ASC
    `;
    return this.db.query<Micro>(sql, [lat, lng, radioKm]);
  }

  async actualizarPasajeros(id: number, dto: ActualizarPasajerosDto): Promise<Micro> {
    const micro = await this.findOne(id);
    let nuevos = micro.pasajerosActuales;

    if (dto.accion === 'SUBIR') {
      if (micro.pasajerosActuales + dto.cantidad > micro.capacidad) {
        throw new BadRequestException(
          `Capacidad máxima excedida. Espacio disponible: ${micro.capacidad - micro.pasajerosActuales} pasajeros (capacidad máxima: ${micro.capacidad})`
        );
      }
      nuevos += dto.cantidad;
    } else {
      nuevos = Math.max(0, micro.pasajerosActuales - dto.cantidad);
    }

    const rows = await this.db.query<Micro>(
      `UPDATE micros SET pasajeros_actuales = $1 WHERE id = $2 RETURNING ${COLUMNAS}`,
      [nuevos, id]
    );
    return rows[0];
  }

  async actualizarUbicacion(id: number, dto: ActualizarUbicacionDto): Promise<Micro> {
    await this.findOne(id);
    const rows = await this.db.query<Micro>(
      `UPDATE micros 
       SET latitud = $1, longitud = $2, ultima_actualizacion_geo = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING ${COLUMNAS}`,
      [dto.latitud, dto.longitud, id]
    );
    return rows[0];
  }

  private mapearError(error: unknown): never {
    const codigo = (error as { code?: string })?.code;
    if (codigo === '23505') throw new ConflictException('La placa o el interno ya están registrados');
    if (codigo === '23503') throw new BadRequestException('La línea o usuario seleccionado no existe');
    if (codigo === '23514') throw new BadRequestException('Los valores del micro son inválidos');
    throw error;
  }

  async create(dto: CreateMicroDto): Promise<Micro> {
    await this.lineas.findOne(dto.lineaId);
    try {
      const rows = await this.db.query<Micro>(
        `INSERT INTO micros (placa, interno, capacidad, estado, linea_id, latitud, longitud)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, -17.7833), COALESCE($7, -63.1821))
         RETURNING ${COLUMNAS}`,
        [
          dto.placa.trim().toUpperCase(),
          dto.interno.trim(),
          dto.capacidad,
          dto.estado || 'ACTIVO',
          dto.lineaId,
          dto.latitud ?? null,
          dto.longitud ?? null
        ]
      );
      return rows[0];
    } catch (error) { return this.mapearError(error); }
  }

  async update(id: number, dto: UpdateMicroDto): Promise<Micro> {
    const actual = await this.findOne(id);
    const cambios = { ...actual, ...dto };
    if (dto.lineaId) await this.lineas.findOne(cambios.lineaId);
    try {
      const rows = await this.db.query<Micro>(
        `UPDATE micros SET placa = $1, interno = $2, capacidad = $3,
         estado = $4, linea_id = $5, pasajeros_actuales = $6,
         latitud = $7, longitud = $8 WHERE id = $9 RETURNING ${COLUMNAS}`,
        [
          cambios.placa.trim().toUpperCase(),
          cambios.interno.trim(),
          cambios.capacidad,
          cambios.estado,
          cambios.lineaId,
          cambios.pasajerosActuales,
          cambios.latitud,
          cambios.longitud,
          id
        ]
      );
      if (!rows[0]) throw new NotFoundException('El micro no existe');
      return rows[0];
    } catch (error) { return this.mapearError(error); }
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.db.query('DELETE FROM micros WHERE id = $1', [id]);
  }
}
