"use client";
// Componente: rep_fact_sheet (pestaña Reporte).
// Fact sheet con las 8 secciones de docs/FACT_SHEET_ANALITICA.md, con datos 2023–2026 y reglas actuales.
// Fuentes: tab_fs_resumen, tab_fs_anio, tab_fs_distribucion (solo agregados; sin datos de personas).
// "Descargar PDF" usa la impresión del navegador ("Guardar como PDF") con los estilos del tablero (ver @media print).
import type { FactSheet, FsAnio, FsDist } from "@/lib/datos";
import { BarrasHorizontales, BarrasVerticalesApiladas, COLORES, RAYADO_VERDE, entero, pct } from "../comunes/graficos";

const v = (n: number | null | undefined, f: (x: number) => string = entero) => (n == null ? "—" : f(n));
const decimal = (n: number) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ETIQUETA_DIST = (d: FsDist) => `${entero(d.docentes)} · ${pct(d.pct)}`;

/** Filas de una sección (ya ordenadas por dbt) */
const seccion = (dist: FsDist[], nombre: string) => dist.filter((d) => d.seccion === nombre);

/** Tabla categoría × año (solo reacomoda los conteos de dbt) */
function TablaPorAnio({ filas, anios, titulo }: { filas: FsDist[]; anios: number[]; titulo: string }) {
  const categorias = [...new Map(filas.map((f) => [f.categoria, f.orden])).entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "es")).map(([c]) => c);
  const valor = (c: string, a: number) => filas.find((f) => f.categoria === c && f.anio === a);
  return (
    <div className="mk-fs-tabla">
      <table className="mk-table">
        <thead><tr><th>{titulo}</th>{anios.map((a) => <th key={a} className="num">{a}</th>)}</tr></thead>
        <tbody>
          {categorias.map((c) => (
            <tr key={c}><td>{c}</td>{anios.map((a) => {
              const f = valor(c, a);
              return <td key={a} className="num">{f ? <>{entero(f.docentes)} <small>{pct(f.pct)}</small></> : "—"}</td>;
            })}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tabla simple de filas por año */
function TablaAnios({ filas, columnas }: { filas: FsAnio[]; columnas: { titulo: string; valor: (d: FsAnio) => string }[] }) {
  return (
    <div className="mk-fs-tabla">
      <table className="mk-table">
        <thead><tr><th>Año</th>{columnas.map((c) => <th key={c.titulo} className="num">{c.titulo}</th>)}</tr></thead>
        <tbody>{filas.map((d) => (
          <tr key={d.anio_lectivo}><td>{d.anio_lectivo}</td>{columnas.map((c) => <td key={c.titulo} className="num">{c.valor(d)}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Seccion({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mk-fs-seccion">
      <h2 className="mk-fs-h2"><span>{numero}</span>{titulo}</h2>
      {children}
    </section>
  );
}

function Bloque({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="mk-fs-bloque">
      <h3>{titulo}</h3>
      {nota && <p className="mk-note">{nota}</p>}
      {children}
    </div>
  );
}

function Cifra({ valor, etiqueta, tono = "principal" }: { valor: string; etiqueta: string; tono?: "principal" | "verde" | "mezcla" | "medio" }) {
  return <div className={`mk-fs-cifra mk-kpi-tono-${tono}`}><b>{valor}</b><span>{etiqueta}</span></div>;
}

export function RepFactSheet({ fs }: { fs: FactSheet }) {
  const { anios, dist, resumen: r } = fs;
  const listaAnios = anios.map((a) => a.anio_lectivo);
  const hoy = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  const conRetencion = anios.filter((a) => a.base_retencion != null);
  const conMcer = anios.filter((a) => a.mcer_comparables > 0);
  const conScore = anios.filter((a) => a.score_comparables > 0);
  const generoTodos = seccion(dist, "genero_todos_los_anios");

  return (
    <div className="mk-fs" data-componente="rep_fact_sheet">
      {/* Acciones (no se imprimen) */}
      <div className="mk-fs-acciones mk-bloque">
        <div>
          <h2>Fact sheet del programa</h2>
          <p className="mk-note">Vista previa con los estilos del tablero. Para el PDF: «Descargar PDF» → destino «Guardar como PDF».</p>
        </div>
        <button type="button" className="mk-fs-boton" onClick={() => window.print()}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
          Descargar PDF
        </button>
      </div>

      <article className="mk-fs-hoja mk-panel">
        {/* Portada */}
        <header className="mk-fs-portada">
          <div>
            <p className="mk-fs-eyebrow">Fact sheet</p>
            <h1>English Without Borders</h1>
            <p>Formación docente en inglés · {r ? `${r.primer_anio}–${r.ultimo_anio}` : ""} · generado el {hoy}</p>
          </div>
          <span className="mk-fs-logo" aria-hidden>EwB</span>
        </header>

        {/* Guía técnica de lectura: qué se muestra y con qué reglas se calcula */}
        <section className="mk-fs-convenciones">
          <h3>Cómo leer este documento</h3>
          <p>
            Este fact sheet resume la participación de docentes en English Without Borders entre {r ? `${r.primer_anio} y ${r.ultimo_anio}` : "los años registrados"}.
            Todas las cifras son agregados calculados sobre la tabla consolidada del programa (capa diamond) y no incluyen datos
            personales. El orden es: resumen ejecutivo, panorama por año, permanencia, perfil, instituciones, nivel cursado,
            mejora de inglés y cumplimiento.
          </p>
          <dl>
            <dt>Unidad de conteo</dt>
            <dd>Docente = persona distinta. Participación = un docente en un año lectivo. Si el registro de un año trae al mismo
              docente dos veces, se conserva una sola fila: la que no está marcada como retirada.</dd>
            <dt>Instituciones (IED)</dt>
            <dd>Nombre oficial según su código DANE. «IED atendidas» cuenta códigos DANE distintos.</dd>
            <dt>Nivel cursado</dt>
            <dd>Nivel del grupo al que se asignó al docente en el año (de PRE A1 a B2, con A2+ y B1+). «Sin nivel asignado» agrupa
              los registros sin grupo de nivel.</dd>
            <dt>MCER</dt>
            <dd>Nivel obtenido en la prueba de entrada y en la de salida. Solo se comparan registros con ambos resultados válidos;
              no se cuentan pruebas no presentadas, invalidadas ni abandonadas.</dd>
            <dt>Permanencia y retención</dt>
            <dd>Permanencia = años distintos en que participó cada docente. Retención = parte de los docentes de un año que vuelve
              al año siguiente.</dd>
            <dt>Perfil</dt>
            <dd>Género y formación académica se toman del último registro con dato de cada docente.</dd>
            <dt>Cumplimiento</dt>
            <dd>La asistencia promedio no incluye a los retirados. El % de constancia se calcula sobre quienes tienen el dato
              (un año sin ese campo aparece como «—»).</dd>
          </dl>
        </section>

        {/* 8. Resumen ejecutivo (primero, como portada de cifras) */}
        <Seccion numero={1} titulo="Resumen ejecutivo">
          <div className="mk-fs-cifras">
            <Cifra valor={v(r?.participantes_unicos)} etiqueta="docentes participantes" />
            <Cifra valor={v(r?.participaciones)} etiqueta="participaciones (docente × año)" tono="verde" />
            <Cifra valor={v(r?.colegios)} etiqueta="IED atendidas" tono="mezcla" />
            <Cifra valor={v(r?.colegios_todos_los_anios)} etiqueta={`IED presentes los ${r?.anios_programa ?? ""} años`} tono="medio" />
          </div>
          <div className="mk-fs-cifras mk-fs-cifras-claras">
            <div><b>{v(r?.mujeres)}</b><span>mujeres</span></div>
            <div><b>{v(r?.hombres)}</b><span>hombres</span></div>
            <div><b>{v(r?.un_anio)}</b><span>1 año</span></div>
            <div><b>{v(r?.dos_anios)}</b><span>2 años</span></div>
            <div><b>{v(r?.tres_anios)}</b><span>3 años</span></div>
            <div><b>{v(r?.cuatro_anios)}</b><span>4 años</span></div>
          </div>
        </Seccion>

        {/* 1. Panorama general */}
        <Seccion numero={2} titulo="Panorama general">
          <Bloque titulo="Docentes por año: nuevos y recurrentes" nota="Nuevo = primer año en el programa; recurrente = ya había participado.">
            <div className="mk-legend"><span><i style={{ background: COLORES[0] }} />Nuevos</span><span><i className="mk-rayado-verde" />Recurrentes</span></div>
            <BarrasVerticalesApiladas filas={anios} categoria={(d) => String(d.anio_lectivo)} etiquetaArriba={(d) => entero(d.docentes)}
              etiqueta="Docentes nuevos y recurrentes por año"
              tramos={[{ valor: (d) => d.nuevos, nombre: "Nuevos", color: COLORES[0] }, { valor: (d) => d.recurrentes, nombre: "Recurrentes", rayado: RAYADO_VERDE }]} />
          </Bloque>
          <Bloque titulo="Participantes por año">
            <TablaAnios filas={anios} columnas={[
              { titulo: "Docentes", valor: (d) => entero(d.docentes) },
              { titulo: "Nuevos", valor: (d) => entero(d.nuevos) },
              { titulo: "Recurrentes", valor: (d) => entero(d.recurrentes) },
              { titulo: "IED", valor: (d) => entero(d.colegios) },
              { titulo: "Grupos", valor: (d) => entero(d.grupos) },
            ]} />
          </Bloque>
        </Seccion>

        {/* 2. Permanencia */}
        <Seccion numero={3} titulo="Permanencia: ¿cuántos años han estado con nosotros?">
          <div className="mk-fs-dos">
            <Bloque titulo="Docentes según años de participación">
              <BarrasHorizontales filas={seccion(dist, "permanencia_anios")} categoria={(d) => d.categoria} valor={(d) => d.docentes}
                formato={entero} etiquetaValor={ETIQUETA_DIST} etiqueta="Docentes según años de participación" />
            </Bloque>
            <Bloque titulo="Retención año a año" nota="De los docentes de un año, cuántos vuelven al siguiente.">
              <TablaAnios filas={conRetencion} columnas={[
                { titulo: "Docentes", valor: (d) => v(d.base_retencion) },
                { titulo: "Continúan", valor: (d) => v(d.continuan) },
                { titulo: "% retención", valor: (d) => v(d.pct_retencion, pct) },
              ]} />
            </Bloque>
          </div>
          <Bloque titulo="Trayectorias: años exactos en que participaron">
            <BarrasHorizontales filas={seccion(dist, "trayectoria")} categoria={(d) => d.categoria} valor={(d) => d.docentes}
              formato={entero} color={COLORES[1]} etiquetaValor={ETIQUETA_DIST} etiqueta="Docentes por trayectoria" />
          </Bloque>
        </Seccion>

        {/* 3. Perfil */}
        <Seccion numero={4} titulo="Perfil de los participantes">
          <div className="mk-fs-dos">
            <Bloque titulo="Género (docentes únicos)" nota="Del último registro con dato de cada docente.">
              <BarrasHorizontales filas={seccion(dist, "genero")} categoria={(d) => d.categoria} valor={(d) => d.docentes}
                formato={entero} etiquetaValor={ETIQUETA_DIST} etiqueta="Docentes por género" />
              {generoTodos.length > 0 && (
                <p className="mk-fs-dato">Quienes participaron los {r?.anios_programa} años: {generoTodos.map((g) => `${entero(g.docentes)} ${g.categoria.toLowerCase()}`).join(" · ")}</p>
              )}
            </Bloque>
            <Bloque titulo="Género por año">
              <TablaAnios filas={anios} columnas={[
                { titulo: "Mujeres", valor: (d) => entero(d.mujeres) },
                { titulo: "Hombres", valor: (d) => entero(d.hombres) },
                { titulo: "Sin dato", valor: (d) => entero(d.genero_sin_dato) },
                { titulo: "% mujeres", valor: (d) => v(d.pct_mujeres, pct) },
              ]} />
            </Bloque>
          </div>
          <Bloque titulo="Nivel de formación académica (docentes únicos)" nota="Del último registro con dato de cada docente.">
            <BarrasHorizontales filas={seccion(dist, "nivel_formacion")} categoria={(d) => d.categoria} valor={(d) => d.docentes}
              formato={entero} color={COLORES[1]} etiquetaValor={ETIQUETA_DIST} etiqueta="Docentes por nivel de formación académica" />
          </Bloque>
          <Bloque titulo="Cargo por año">
            <TablaPorAnio filas={seccion(dist, "cargo_anio")} anios={listaAnios} titulo="Cargo" />
          </Bloque>
        </Seccion>

        {/* 4. IED */}
        <Seccion numero={5} titulo="Instituciones (IED)">
          <Bloque titulo="Las 10 IED con más docentes (histórico)" nota={`${v(r?.colegios)} IED en total; ${v(r?.colegios_todos_los_anios)} estuvieron presentes todos los años.`}>
            <div className="mk-fs-tabla">
              <table className="mk-table">
                <thead><tr><th>#</th><th>IED</th><th className="num">Docentes</th><th className="num">Años presente</th></tr></thead>
                <tbody>{seccion(dist, "top_ied").map((d) => (
                  <tr key={d.categoria}><td>{d.orden}</td><td>{d.categoria}</td><td className="num">{entero(d.docentes)}</td><td className="num">{v(d.extra)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </Bloque>
        </Seccion>

        {/* 5. Nivel cursado */}
        <Seccion numero={6} titulo="Nivel cursado (nivel del grupo asignado)">
          <Bloque titulo="Docentes por nivel cursado y año">
            <TablaPorAnio filas={seccion(dist, "nivel_cursado_anio")} anios={listaAnios} titulo="Nivel" />
          </Bloque>
          <div className="mk-fs-dos">
            <Bloque titulo="Progresión: primer vs. último nivel" nota="Docentes con nivel en 2 o más años.">
              <BarrasHorizontales filas={seccion(dist, "progresion_nivel")} categoria={(d) => d.categoria} valor={(d) => d.docentes}
                formato={entero} etiquetaValor={ETIQUETA_DIST} etiqueta="Progresión del nivel cursado" />
            </Bloque>
            <Bloque titulo="Transición de nivel al año siguiente">
              <TablaAnios filas={conRetencion} columnas={[
                { titulo: "Comparables", valor: (d) => v(d.nivel_comparables) },
                { titulo: "Subieron", valor: (d) => v(d.nivel_subieron) },
                { titulo: "Igual", valor: (d) => v(d.nivel_mismo) },
                { titulo: "Bajaron", valor: (d) => v(d.nivel_bajaron) },
              ]} />
            </Bloque>
          </div>
        </Seccion>

        {/* 6. Mejora de inglés */}
        <Seccion numero={7} titulo="Mejora de inglés (MCER y puntaje)">
          <Bloque titulo="MCER de salida por año">
            <TablaPorAnio filas={seccion(dist, "mcer_salida_anio")} anios={listaAnios} titulo="MCER de salida" />
          </Bloque>
          <Bloque titulo="Mejora en el mismo año (entrada vs. salida)">
            <TablaAnios filas={conMcer} columnas={[
              { titulo: "Con ambas", valor: (d) => entero(d.mcer_comparables) },
              { titulo: "Mejoraron", valor: (d) => entero(d.mcer_mejoraron) },
              { titulo: "Igual", valor: (d) => entero(d.mcer_mantuvieron) },
              { titulo: "Bajaron", valor: (d) => entero(d.mcer_bajaron) },
              { titulo: "% mejoró", valor: (d) => v(d.pct_mcer_mejoraron, pct) },
            ]} />
          </Bloque>
          <Bloque titulo="Mejora histórica" nota="Primer MCER de entrada vs. último MCER de salida de cada docente.">
            <BarrasHorizontales filas={seccion(dist, "mejora_historica_mcer")} categoria={(d) => d.categoria} valor={(d) => d.docentes}
              formato={entero} color={COLORES[1]} etiquetaValor={ETIQUETA_DIST} etiqueta="Mejora histórica del MCER" />
          </Bloque>
          <Bloque titulo="Puntaje (score) por año" nota="Docentes con puntaje de entrada y de salida.">
            <TablaAnios filas={conScore} columnas={[
              { titulo: "Con ambos", valor: (d) => entero(d.score_comparables) },
              { titulo: "Prom. entrada", valor: (d) => v(d.score_entrada_promedio, decimal) },
              { titulo: "Prom. salida", valor: (d) => v(d.score_salida_promedio, decimal) },
              { titulo: "Subieron", valor: (d) => entero(d.score_subieron) },
            ]} />
          </Bloque>
        </Seccion>

        {/* 7. Cumplimiento */}
        <Seccion numero={8} titulo="Cumplimiento: constancias y asistencia">
          <div className="mk-fs-dos">
            <Bloque titulo="Constancias por año">
              <TablaAnios filas={anios} columnas={[
                { titulo: "Con", valor: (d) => entero(d.con_constancia) },
                { titulo: "Sin", valor: (d) => entero(d.sin_constancia) },
                { titulo: "% con", valor: (d) => v(d.pct_constancia, pct) },
              ]} />
            </Bloque>
            <Bloque titulo="Asistencia por año">
              <TablaAnios filas={anios} columnas={[
                { titulo: "Promedio", valor: (d) => v(d.asistencia_promedio, pct) },
                { titulo: "≥ 80 %", valor: (d) => entero(d.asistencia_80_o_mas) },
                { titulo: "< 80 %", valor: (d) => entero(d.asistencia_menos_80) },
                { titulo: "Sin dato", valor: (d) => entero(d.asistencia_sin_dato) },
              ]} />
            </Bloque>
          </div>
        </Seccion>

        <footer className="mk-fs-pie">English Without Borders · Fact sheet {r ? `${r.primer_anio}–${r.ultimo_anio}` : ""} · Desarrollado por TeseoDev · Medellín ©</footer>
      </article>
    </div>
  );
}
