import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLineaDto } from './dto/create-linea.dto';
import { UpdateLineaDto } from './dto/update-linea.dto';
import { Linea } from './linea.interface';

@Injectable()
export class LineasService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Promise<Linea[]> {
    return this.db.query<Linea>('SELECT id, numero, nombre, zona, descripcion, color FROM lineas ORDER BY id');
  }

  async findOne(id: number): Promise<Linea> {
    const rows = await this.db.query<Linea>(
      'SELECT id, numero, nombre, zona, descripcion, color FROM lineas WHERE id = $1', [id]
    );
    if (!rows[0]) throw new NotFoundException('La línea no existe');
    return rows[0];
  }

  async create(dto: CreateLineaDto): Promise<Linea> {
    try {
      const rows = await this.db.query<Linea>(
        `INSERT INTO lineas (numero, nombre, zona, descripcion, color)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, numero, nombre, zona, descripcion, color`,
        [dto.numero.trim(), dto.nombre.trim(), dto.zona.trim(), dto.descripcion.trim(), dto.color?.trim() || '#16a34a'],
      );
      return rows[0];
    } catch (error: any) {
      if (error?.code === '23505') throw new ConflictException('Ya existe una línea con ese número');
      throw error;
    }
  }

  async update(id: number, dto: UpdateLineaDto): Promise<Linea> {
    const actual = await this.findOne(id);
    const cambios = {
      numero: dto.numero?.trim() ?? actual.numero,
      nombre: dto.nombre?.trim() ?? actual.nombre,
      zona: dto.zona?.trim() ?? actual.zona,
      descripcion: dto.descripcion?.trim() ?? actual.descripcion,
      color: dto.color?.trim() ?? actual.color,
    };
    try {
      const rows = await this.db.query<Linea>(
        `UPDATE lineas SET numero = $1, nombre = $2, zona = $3, descripcion = $4, color = $5
         WHERE id = $6 RETURNING id, numero, nombre, zona, descripcion, color`,
        [cambios.numero, cambios.nombre, cambios.zona, cambios.descripcion, cambios.color, id],
      );
      if (!rows[0]) throw new NotFoundException('La línea no existe');
      return rows[0];
    } catch (error: any) {
      if (error?.code === '23505') throw new ConflictException('Ya existe una línea con ese número');
      throw error;
    }
  }
}
