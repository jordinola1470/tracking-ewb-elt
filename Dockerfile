# syntax=docker/dockerfile:1
# =====================================================================
# Imagen del pipeline tracking-ewb-elt: un trabajo que corre y termina.
#   docker run <imagen> cargar | transformar
# NO contiene Excel, .env ni contraseñas: llegan desde afuera al ejecutar.
# =====================================================================

# ---------- Etapa 1: instalar dependencias de producción ----------
FROM ghcr.io/astral-sh/uv:0.10.2 AS uv
FROM python:3.11-slim AS builder

COPY --from=uv /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app
COPY pyproject.toml uv.lock ./
# --frozen: usa exactamente las versiones de uv.lock | --no-dev: sin pytest ni pre-commit
RUN uv sync --frozen --no-dev --no-install-project

# ---------- Etapa 2: imagen final, delgada y sin herramientas de build ----------
FROM python:3.11-slim

# Usuario sin privilegios de administrador
RUN useradd --create-home --uid 1000 pipeline

COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DBT_TARGET_PATH=/tmp/dbt/target \
    DBT_LOG_PATH=/tmp/dbt/logs \
    DBT_SEND_ANONYMOUS_USAGE_STATS=False

WORKDIR /app
COPY --chown=pipeline:pipeline main.py ./
COPY --chown=pipeline:pipeline config/ ./config/
COPY --chown=pipeline:pipeline infrastructure/ ./infrastructure/
COPY --chown=pipeline:pipeline src/ ./src/
COPY --chown=pipeline:pipeline dbt_project/ ./dbt_project/

USER pipeline

ENTRYPOINT ["python", "main.py"]
CMD ["--help"]
