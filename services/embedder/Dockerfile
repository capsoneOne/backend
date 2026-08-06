FROM python:3.11-slim

WORKDIR /srv

# Dependencies first so the layer caches across code edits. Model weights are large;
# when a real model lands, download them in a separate layer here rather than at
# startup, so container start stays fast.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY tests ./tests

EXPOSE 8000

# Single worker: model weights are held per-process, so replicas cost real memory.
# Scale with container replicas rather than workers once the real model lands.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
