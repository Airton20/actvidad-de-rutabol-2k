import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Tarifa } from './tarifa.interface';

@Injectable()
export class TarifasService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<Tarifa[]> {
    return this.db.query<Tarifa>(
      'SELECT id, categoria, monto::float AS monto, descripcion FROM tarifas ORDER BY id'
    );
  }

  async findByCategoria(categoria: string): Promise<Tarifa> {
    const rows = await this.db.query<Tarifa>(
      'SELECT id, categoria, monto::float AS monto, descripcion FROM tarifas WHERE categoria = $1',
      [categoria]
    );
    if (!rows[0]) throw new NotFoundException(`No existe tarifa para la categoría ${categoria}`);
    return rows[0];
  }

  async update(id: number, monto: number): Promise<Tarifa> {
    const rows = await this.db.query<Tarifa>(
      'UPDATE tarifas SET monto = $1 WHERE id = $2 RETURNING id, categoria, monto::float AS monto, descripcion',
      [monto, id]
    );
    if (!rows[0]) throw new NotFoundException('Tarifa no encontrada');
    return rows[0];
  }
}
