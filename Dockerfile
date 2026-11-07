FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PORT=3000 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Paquetes del sistema al día (OpenSSL, libssl, zlib…) antes de bajar privilegios.
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 appuser

COPY --chown=appuser:appuser serve.py ./serve.py
COPY --chown=appuser:appuser music-player ./music-player

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python3 -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:3000/').status==200 else 1)"

CMD ["python3", "serve.py"]
