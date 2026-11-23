import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';

export interface UsuarioInfo {
  id: number;
  username: string;
  rol: 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';
  nombreCompleto?: string;
  categoria: 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';
  estudianteValidado: boolean;
}

interface UsuarioRow {
  id: number;
  username: string;
  password_hash: string;
  rol: 'ADMIN' | 'CONDUCTOR' | 'PASAJERO';
  nombre_completo?: string;
  categoria: 'GENERAL' | 'ESCOLAR' | 'UNIVERSITARIO' | 'ADULTO_MAYOR';
  estudiante_validado: boolean;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password) {
      console.warn('ADMIN_USERNAME/ADMIN_PASSWORD no configurados; se omite bootstrap de admin');
      return;
    }
    try {
      const hashSeguro = await hash(password, 12);
      await this.db.query(
        `INSERT INTO usuarios (username, password_hash, rol, nombre_completo, categoria, estudiante_validado)
         VALUES ($1, $2, 'ADMIN', 'Administrador General', 'GENERAL', TRUE)
         ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [username, hashSeguro],
      );
    } catch {
      // Ignorar si la base de datos no está levantada al arrancar
    }
  }

  async register(dto: RegisterDto): Promise<UsuarioInfo> {
    const categoria = dto.categoria || 'GENERAL';
    if (categoria === 'UNIVERSITARIO') {
      if (!dto.emailUpds || !dto.emailUpds.toLowerCase().endsWith('@upds.edu.bo')) {
        throw new BadRequestException('Para categoría universitaria, el correo debe terminar en @upds.edu.bo');
      }
      if (!dto.codEst) throw new BadRequestException('Para categoría universitaria, debe registrar su código de estudiante codEst');
    }
    if (categoria === 'ESCOLAR' && !dto.codigoRude) {
      throw new BadRequestException('Para categoría escolar, debe registrar su código RUDE');
    }

    const hashPassword = await hash(dto.password, 10);
    try {
      const rows = await this.db.query<UsuarioRow>(
        `INSERT INTO usuarios
         (username, password_hash, rol, nombre_completo, categoria, codigo_rude, cod_est, email_upds, foto_credencial_url, estudiante_validado)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, username, rol, nombre_completo, categoria, estudiante_validado`,
        [
          dto.username.trim(), hashPassword, dto.rol || 'PASAJERO', dto.nombreCompleto || null,
          categoria, dto.codigoRude || null, dto.codEst || null, dto.emailUpds || null,
          dto.fotoCredencialUrl || null, categoria === 'GENERAL' || categoria === 'ADULTO_MAYOR',
        ],
      );
      const u = rows[0];
      return { id: u.id, username: u.username, rol: u.rol, nombreCompleto: u.nombre_completo, categoria: u.categoria, estudianteValidado: u.estudiante_validado };
    } catch (error: any) {
      if (error?.code === '23505') throw new ConflictException('El nombre de usuario ya está registrado');
      throw error;
    }
  }

  async validar(username: string, password: string): Promise<UsuarioInfo> {
    const rows = await this.db.query<UsuarioRow>(
      `SELECT id, username, password_hash, rol, nombre_completo, categoria, estudiante_validado
       FROM usuarios WHERE username = $1`,
      [username],
    );
    const usuario = rows[0];
    if (!usuario || !(await compare(password, usuario.password_hash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return { id: usuario.id, username: usuario.username, rol: usuario.rol, nombreCompleto: usuario.nombre_completo, categoria: usuario.categoria, estudianteValidado: usuario.estudiante_validado };
  }

  async obtenerUsuario(id: number): Promise<UsuarioInfo> {
    const rows = await this.db.query<UsuarioRow>(
      `SELECT id, username, password_hash, rol, nombre_completo, categoria, estudiante_validado FROM usuarios WHERE id = $1`,
      [id],
    );
    const u = rows[0];
    if (!u) throw new UnauthorizedException('No existe sesión activa');
    return { id: u.id, username: u.username, rol: u.rol, nombreCompleto: u.nombre_completo, categoria: u.categoria, estudianteValidado: u.estudiante_validado };
  }

  async pendientesValidacion(): Promise<UsuarioInfo[]> {
    const rows = await this.db.query<UsuarioRow>(
      `SELECT id, username, '' as password_hash, rol, nombre_completo, categoria, estudiante_validado
       FROM usuarios WHERE categoria IN ('ESCOLAR','UNIVERSITARIO') AND estudiante_validado = FALSE ORDER BY id DESC`,
    );
    return rows.map((u) => ({ id: u.id, username: u.username, rol: u.rol, nombreCompleto: u.nombre_completo, categoria: u.categoria, estudianteValidado: u.estudiante_validado }));
  }

  async validarEstudiante(id: number, aprobado: boolean): Promise<{ mensaje: string }> {
    const rows = await this.db.query('UPDATE usuarios SET estudiante_validado = $1 WHERE id = $2 RETURNING id', [aprobado, id]);
    if (!rows[0]) throw new NotFoundException('Usuario no encontrado');
    return { mensaje: aprobado ? 'Estudiante validado con éxito' : 'Estudiante revocado/rechazado' };
  }
}
