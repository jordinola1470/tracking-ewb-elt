# Arquitectura y Diseño de la Tabla de Hechos: `fct_docentes`

Este documento explica el proceso de construcción de la tabla central del Modelo Dimensional (Capa Marts) y justifica las decisiones clave de ingeniería de datos sobre su estructura física.

---

## 1. ¿Cómo se construye `fct_docentes`?

La tabla `fct_docentes` es el corazón del esquema de Estrella del proyecto. Se construye dinámicamente mediante **dbt (Data Build Tool)** a través del siguiente flujo lógico durante su ejecución (`dbt run`):

1. **Unificación Histórica (UNION ALL):** La tabla consolida los datos métricos de todos los años lectivos (2023, 2024, 2025) apilando los registros provenientes de las vistas dependientes de la capa Staging (`stg_docentes_202X`).
2. **Transformación Segura de Métricas:** 
   - Los puntajes (`score_entrada`, `score_salida`) y porcentajes de asistencia se procesan condicionalmente (Regex) desde la capa Staging. Esto garantiza que anomalías manuales del excel crudo (ej. una celda que dice "No presentó") se traduzcan en escalares puros o `NULL`, permitiendo el casteo matemático.
3. **Mapeo Dimensional de Llaves Foráneas (Dimensional Modeling):**
   - **Dimensiones Base:** Hereda directamente identificadores limpios como `docente_id`, `codigo_dane` (para enlazar geografía institucional en `dim_ied`) y `grupo_id` (para su cruce con datos base de asignatura `dim_curso`).
   - **Claves Sustitutas (Surrogate Keys):** Genera identificadores analíticos inmutables, como el `perfil_id`. Este se construye emitiendo un hash unívoco (MD5 cruzando `docente_id` + `anio_lectivo`) el cual apunta a `dim_perfil`. Así permite que haya un rastreo detallado sobre cómo el tipo de nombramiento o cargo del profesor va subiendo/cambiando de año a año, respetando la estricta naturaleza analítica (SCD-Type 2 adaptado).
   - **Diccionarios Numéricos:** Traduce los niveles de clasificación alfabética del MCEr (Ej. "A2", "B1") en identificadores numéricos directos (`mcer_entrada_id`, `mcer_salida_id`) realizando `LEFT JOIN` semánticos contra la tabla catálogo temporal `dim_mcer`. Esto es lo que permite que una Inteligencia Artificial pueda crear funciones heurísticas mayores, menores o calculando deltas (> 3 niveles, etc.).

---

## 2. ¿Por qué `fct_docentes` NO tiene Llaves Primarias (PK) ni Foráneas (FK) físicas en PostgreSQL?

Al observar la base de datos PostgreSQL generada por el orquestador o interactuar con un DBeaver / pgAdmin, se nota rápidamente que ni `fct_docentes` ni sus dimensiones satelitales (`dim_curso`, `dim_perfil`, etc.) tienen declaradas restricciones vinculantes físicas explícitas mediante Constrains de `PRIMARY KEY` o `FOREIGN KEY` (vía `ADD CONSTRAINT DDL`).

No se trata de una omisión accidentada ni de código débil, sino de una **Mejor Práctica (Best Practice) de arquitectura** universal en un ecosistema conocido como **Modern Data Stack (MDS)** en Data Warehousing analítico, por las siguientes justificaciones críticas:

### A. Rendimiento Excepcional en Carga Masiva (OLAP y ELT)
Una base de datos analítica está diseñada fundamentalmente para leer, escribir o reescribir millones de filas masivas en un solo barrido (Batching). Si existieran Claves Foráneas duras y persistentes, PostgreSQL tendría penalizaciones masivas de procesamiento y tiempo de CPU, teniendo que ejecutar la validación secuencial fila-por-fila asegurándose que el `codigo_dane` foráneo realmente esté escrito en la tabla IED al momento del Insert. 

### B. Materialización Destructiva vs Restricciones Duras
El paradigma central de **dbt** radica en procesos estables y declarativos (`Drop and Recreate` y persistencias iterativas sobre tablas y vistas). Cada vez que la herramienta corre (`uv run dbt run`), el pipeline estructuralmente destruye la tabla temporal pasada `marts.fct_docentes` y crea de manera idéntica su versión inyectada final e idónea. Si hubiera dependencias físicas relacionales, los Drop Tables harían "Crash" bloqueando por errores de violaciones circulares PostgreSQL en cascada permanente, tumbando por consecuente el orquestador principal de Machine Learning.

### C. Confianza traslacional al Código, no a la Base de Datos Histórica
En el pasado (sistemas OLTP o relacionales base), la Integridad Referencial recaía en ser defendida por la base de datos. Dentro de ingenierías robustas actuales, **la Integridad se traslada a las capas de Transformación Lógica**. 
Si hay un registro mal cruzado que no concuerda (`mcer_salida` inventado), no se hace un "rollback error" tradicional mediante el DDL de constrain SQL, en lugar de eso el pipeline de DBT hace un testeo de `relación`, `not_null` y `unique tests` lógicos en tiempo de pre-compilación, cancelando el Pipeline desde Python/Dbt de forma segura e inteligible previo a la polución de reportes institucionales o Dashboards BI.

### D. Ausencia Transaccional Sensible del Cliente
Este esquema Medallion (`marts` Gold) existe empíricamente **para Consolidar Reportes (Read Only Analytics)**. Una restricción rígida en PK se diseña para que el sistema detone una alarma fuerte en caso un *Actor final intente hacer un DELETE de una fila o un UPDATE a nivel granular en vivo*. Este caso en tracking analítico no existe dado que la data viene de Orígenes Excel y el puente (Agentes Inteligentes y Científicos) corren sobre permisos Read-Only, desestimando funcionalmente el gasto extra computacional que impone el FK hard-constraint.
