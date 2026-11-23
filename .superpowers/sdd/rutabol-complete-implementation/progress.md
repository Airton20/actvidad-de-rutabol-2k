# SDD ledger — plan: docs/superpowers/plans/2026-11-23-rutabol-complete-implementation.md

## Preflight scan

| Task pair / Task | Interface / self-check | Finding | Ruling |
|---|---|---|---|
| T1 ↔ T2 | T1 modifica guards; T2 modifica auth controller/service y usa AdminGuard | Compatible | Ninguno |
| T2 ↔ T4 | T2 produce `/auth/me` con nombreCompleto/estudianteValidado y `/auth/pendientes`; T4 frontend types/api los consume | Compatible | Ninguno |
| T4 ↔ T5-T8 | T4 produce SessionProvider/useSession/RoleGuard/api/types; T5-T8 los consumen | Compatible | Ninguno |
| T1 ↔ T6-T8 | Permisos backend deben coincidir con UI por rol | Compatible si se aplica matriz spec | Ninguno |
| T9 ↔ Global | README/GUIA tienen secretos reales actualmente | Debe limpiarse | Ruling: eliminar credenciales/URLs/secretos reales y usar placeholders — por seguridad — costo si mal: docs incompletas, pero sin fuga de secretos |
| Git repo | Plan incluye commits git; repo no es git | No hay .git | Ruling: omitir commits git y registrar progreso en ledger — repo no inicializado — costo si mal: sin historial git, pero cambios quedan en archivos |

## Progress

