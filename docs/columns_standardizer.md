# Documentación del Modelo de Datos: Dimensiones

Este documento detalla la lógica de estandarización para las columnas descriptivas (Dimensiones) del proyecto Tracking-EwB-IA, integrando las fuentes de los años 2023, 2024 y 2025.

## 1. Mapeo de Estandarización de Etiquetas

| Entidad | Atributo Estándar | Fuente 2023 | Fuente 2024 | Fuente 2025 |
| :--- | :--- | :--- | :--- | :--- |
| **DOCENTE** | `docente_nombre` | PARTICIPANTE | PARTICIPANTE | PARTICIPANTE / NOMBRES... |
| | `docente_id` | ID | ID | ID |
| | `tipo_documento` | TIPO ID | TIPO ID | (N/A) |
| | `genero` | GENERO | GENERO | GENERO |
| | `fecha_nacimiento` | FECHA DE NACIMIENTO | FECHA DE NACIMIENTO | FECHA DE NACIMIENTO (DD/MM/AAAA) |
| | `correo_electronico`| CORREO ELECTRONICO | CORREO ELECTRONICO | CORREO ELECTRONICO |
| | `telefono_celular` | CELULAR | CELULAR | CELULAR |
| **IED** | `colegio_nombre` | IED | IED | IED |
| | `codigo_dane` | DANE | DANE | DANE |
| | `ubicacion_geo` | (N/A) | CLUSTER | MUNICIPIO DE RESIDENCIA |
| **PERFIL** | `nivel_formacion` | NIVEL DE FORMACIÓN | NIVEL DE FORMACIÓN | NIVEL DE FORMACIÓN |
| | `cargo_rol` | ROL QUE DESEMPEÑA | ROL QUE DESEMPEÑA | CARGO / CARGO.1 |
| | `tipo_nombramiento`| TIPO DE NOMBRAMIENTO| TIPO DE NOMBRAMIENTO| TIPO DE NOMBRAMIENTO... |
| | `jornada_laboral` | JORNADA | JORNADA | JORNADA EDUCATIVA... |
| | `grado_dicta` | CURSO-NIVEL | NIVEL DICTA / GRADO | NIVEL EDUCATIVO QUE ORIENTA |
| **CURSO** | `grupo_id` | GRUPO EWB | GRUPO | GRUPO |
| | `nivel_asignado` | CURSO-NIVEL | NIVEL | NIVEL |
| | `es_remoto` | REMOTE | (N/A) | (N/A) |

## 2. Reglas de Transformación (Logica de Negocio)

1. **Concatenación de Nombres (2025):** Para la fuente 2025, si la columna `PARTICIPANTE` está incompleta, se debe reconstruir `docente_nombre` mediante: `NOMBRES` + `PRIMER APELLIDO` + `SEGUNDO APELLIDO`.
2. **Identificador Único:** El campo `docente_id` actúa como la Primary Key (PK) para el cruce longitudinal de docentes entre años.
3. **Manejo de Nulos:** Los campos marcados como `(N/A)` en años específicos deben inicializarse como `None` o `String.Empty` para mantener la integridad del esquema.
4. **Normalización de Fechas:** Todas las variaciones de fecha de nacimiento deben ser parseadas al estándar ISO `YYYY-MM-DD`.