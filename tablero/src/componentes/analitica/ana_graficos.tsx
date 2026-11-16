"use client";
// Componentes de gráficos de la vista Analítica. Cada uno indica su fuente (tabla dbt).
import type { CargoAnio, KpiAnio, NivelAnio, Permanencia } from "@/lib/datos";
import { BarrasApiladas, BarrasHorizontales, BarrasVerticales, COLORES, Torta, entero, pct } from "../comunes/graficos";

function Tarjeta({ nombre, titulo, nota, ancho, children }: { nombre: string; titulo: string; nota: React.ReactNode; ancho?: boolean; children: React.ReactNode }) {
  return (
    <div className="mk-card" data-componente={nombre} style={ancho ? { gridColumn: "1/-1" } : undefined}>
      <h2>{titulo}</h2>
      <p className="mk-note">{nota}</p>
      {children}
    </div>
  );
}

/** ana_graf_pruebas_nivel · fuente: tab_pruebas_nivel_anio (del año) */
export function AnaGrafPruebasNivel({ niveles }: { niveles: NivelAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_pruebas_nivel" ancho titulo="Pruebas presentadas por nivel de formación"
      nota="Del año. Cada barra es el total de matriculados en ese nivel, dividido según las pruebas que presentaron. A la derecha, el % que completó entrada y salida.">
      <div className="mk-legend">
        <span><i style={{ background: COLORES[0] }} />Entrada y salida</span>
        <span><i style={{ background: COLORES[1] }} />Solo entrada</span>
        <span><i style={{ background: "var(--cds-chart-muted)" }} />Sin prueba de entrada</span>
      </div>
      <BarrasApiladas filas={niveles} categoria={(d) => d.nivel_formacion} total={(d) => d.matriculados} extra={(d) => pct(d.pct_entrada_salida)}
        etiqueta="Matriculados por nivel de formación divididos según las pruebas presentadas"
        tramos={[
          { valor: (d) => d.con_entrada_salida, nombre: "Entrada y salida", color: COLORES[0], textoClaro: true },
          { valor: (d) => d.solo_entrada, nombre: "Solo entrada", color: COLORES[1], textoClaro: true },
          { valor: (d) => d.sin_entrada, nombre: "Sin prueba de entrada", color: "var(--cds-chart-muted)" },
        ]} />
    </Tarjeta>
  );
}

/** ana_graf_constancia_anio · fuente: tab_kpis_anio (todos los años) */
export function AnaGrafConstanciaAnio({ kpis }: { kpis: KpiAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_constancia_anio" titulo="% con constancia, año por año" nota="Cada año se mide por separado; no se acumula.">
      <BarrasVerticales filas={kpis} categoria={(d) => String(d.anio_lectivo)} valor={(d) => d.pct_constancia} formato={pct} max={1}
        etiqueta="Porcentaje con constancia en cada año" />
    </Tarjeta>
  );
}

/** ana_graf_permanencia · fuente: tab_permanencia (todos los años) */
export function AnaGrafPermanencia({ permanencia }: { permanencia: Permanencia[] }) {
  const continuos = permanencia.filter((d) => d.es_continuo).reduce((s, d) => s + d.docentes, 0);
  return (
    <Tarjeta nombre="ana_graf_permanencia" titulo="Permanencia de los docentes"
      nota={<>Todos los años. Continua = 2 o más años seguidos. Docentes en forma continua: <b>{entero(continuos)}</b>.</>}>
      <Torta filas={permanencia} categoria={(d) => d.permanencia} valor={(d) => d.docentes}
        etiqueta="Docentes según los años en que participaron y si fueron seguidos" />
    </Tarjeta>
  );
}

/** ana_graf_constancia_nivel · fuente: tab_pruebas_nivel_anio (del año) */
export function AnaGrafConstanciaNivel({ niveles }: { niveles: NivelAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_constancia_nivel" titulo="% con constancia por nivel de formación" nota="Del año.">
      <BarrasHorizontales filas={niveles} categoria={(d) => d.nivel_formacion} valor={(d) => d.pct_constancia} formato={pct} max={1} alto={260}
        etiqueta="Porcentaje con constancia por nivel de formación" />
    </Tarjeta>
  );
}

/** ana_graf_constancia_cargo · fuente: tab_constancia_cargo_anio (del año) */
export function AnaGrafConstanciaCargo({ cargos }: { cargos: CargoAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_constancia_cargo" titulo="% con constancia por cargo" nota="Del año.">
      <BarrasHorizontales filas={cargos} categoria={(d) => d.cargo} valor={(d) => d.pct_constancia} formato={pct} max={1} alto={200}
        etiqueta="Porcentaje con constancia por cargo" />
    </Tarjeta>
  );
}

/** ana_graf_nivel_formacion · fuente: tab_pruebas_nivel_anio (del año) */
export function AnaGrafNivelFormacion({ niveles }: { niveles: NivelAnio[] }) {
  return (
    <Tarjeta nombre="ana_graf_nivel_formacion" titulo="Nivel de formación de los docentes" nota="Participaciones del año por nivel del grupo asignado.">
      <BarrasHorizontales filas={niveles} categoria={(d) => d.nivel_formacion} valor={(d) => d.matriculados} formato={entero} alto={220}
        etiqueta="Participaciones por nivel de formación" />
    </Tarjeta>
  );
}
