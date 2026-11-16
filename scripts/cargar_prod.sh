#!/usr/bin/env bash
# =====================================================================
# Carga a PRODUCCIÓN (Supabase ewb-entorno-prod) los Excel de data/ que cambiaron
# y reconstruye las tablas finales.
#
#   scripts/cargar_prod.sh                  # revisa los 4 años y carga solo los que cambiaron
#   scripts/cargar_prod.sh --anio 2026      # solo ese año
#   scripts/cargar_prod.sh --anio 2026 --forzar
#
# Usa la MISMA imagen que está desplegada (la del último commit de main en GHCR),
# así los datos se procesan con el código que ya pasó CI y staging.
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

# Solo para pruebas se pueden cambiar (ej. contra staging con Excel ficticios)
ENV_FILE="${EWB_ENV_FILE:-.env.entorno_prod}"
CARPETA_DATOS="${EWB_DATA_DIR:-$PWD/data}"
ENTORNO="${EWB_ENTORNO_NOMBRE:-PRODUCCIÓN (ewb-entorno-prod)}"

export PATH="$HOME/.docker/bin:$PATH"

# --- Verificaciones previas ---
[[ -f "$ENV_FILE" ]] || { echo "❌ No existe $ENV_FILE"; exit 1; }
[[ -d "$CARPETA_DATOS" ]] || { echo "❌ No existe la carpeta de Excel: $CARPETA_DATOS"; exit 1; }
docker info >/dev/null 2>&1 || { echo "❌ Docker no está encendido. Abre Docker Desktop y reintenta."; exit 1; }

git fetch -q origin main
ETIQUETA="$(git rev-parse --short=7 origin/main)"
IMAGEN="ghcr.io/jordinola1470/tracking-ewb-elt:${ETIQUETA}"

# --- Confirmación ---
echo "⚠️  Vas a cargar los Excel de: $CARPETA_DATOS"
echo "    Destino: $ENTORNO"
echo "    Código:  $IMAGEN (último commit de main)"
read -r -p "Escribe SI para continuar: " respuesta
[[ "$respuesta" == "SI" ]] || { echo "Cancelado. No se cargó nada."; exit 1; }

# --- Ejecución ---
echo "📦 Descargando la imagen..."
docker pull -q "$IMAGEN" >/dev/null

echo "1/2 cargar"
docker run --rm --env-file "$ENV_FILE" -v "$CARPETA_DATOS:/app/data:ro" "$IMAGEN" cargar "$@"

echo "2/2 transformar"
docker run --rm --env-file "$ENV_FILE" "$IMAGEN" transformar

echo "✅ Listo: $ENTORNO actualizado."
