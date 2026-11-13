"""
Punto de entrada del pipeline tracking-ewb-elt.

    uv run python main.py cargar                     # carga a raw los años cuyo Excel cambió
    uv run python main.py cargar --anio 2026         # revisa y carga solo ese año
    uv run python main.py cargar --anio 2026 --forzar
    uv run python main.py transformar                # dbt build: staging -> marts -> public (solo desde raw)

Código de salida: 0 si todo salió bien, 1 si hubo error (GitHub Actions lo marca en rojo).
"""
import argparse
import os  # ERROR A PROPÓSITO: import sin usar (prueba de fuego del CI)
import sys

from src.exceptions import BaseProjectException


def _cargar(anio: int | None, forzar: bool) -> None:
    from src.ingestor import ingestor_pipeline  # import diferido: `transformar` no necesita los Excel

    objetivo = f"año {anio}" if anio else "todos los años"
    print(f"1. Carga a capa Bronze (raw): {objetivo}...")
    for resultado in ingestor_pipeline.cargar(anio=anio, forzar=forzar):
        print(f"   {resultado}")
    print("✅ Carga terminada. Ejecuta `transformar` para actualizar las tablas finales.")


def _transformar() -> None:
    from src.transformer import dbt_pipeline

    print("2. Transformación con dbt build (staging -> marts -> public)...")
    dbt_pipeline.build()
    print("✅ Transformación terminada.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="main.py",
        description="Pipeline ELT tracking-ewb-elt (carga a raw y transformación con dbt).",
    )
    sub = parser.add_subparsers(dest="comando")

    p_cargar = sub.add_parser("cargar", help="Carga a raw los Excel nuevos o modificados (compara la huella del archivo).")
    p_cargar.add_argument("--anio", type=int, help="Año a cargar (por defecto, todos los de sources.yaml).")
    p_cargar.add_argument("--forzar", action="store_true", help="Recarga aunque el archivo no haya cambiado.")

    sub.add_parser("transformar", help="Construye staging, marts y public con dbt build, solo desde raw.")

    args = parser.parse_args(argv)
    if args.comando is None:
        parser.print_help()
        return 0

    try:
        if args.comando == "cargar":
            _cargar(args.anio, args.forzar)
        elif args.comando == "transformar":
            _transformar()
    except BaseProjectException as e:
        # Errores esperados del proyecto: mensaje corto y claro (sin datos personales)
        print(f"❌ {type(e).__name__}: {e.message}", file=sys.stderr)
        return 1
    # Errores inesperados: Python muestra el detalle completo y termina con código 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
