# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /srv

# Dependencies first so the layer caches across code edits.
#
# The cache mount matters more than it looks. `--no-cache-dir` (the usual advice for
# slim images) throws the wheels away, so every rebuild re-downloads them. That is
# tolerable at ~50 MB; once a real encoder lands and torch is in this file it is
# ~2.5 GB of download per rebuild. The mount keeps the pip cache outside the image,
# so the image stays small AND rebuilds re-download nothing.
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Model weights live on a mounted volume, not in the image. Downloading ~600 MB of
# CLIP weights on every container recreate is the other easy way to burn bandwidth.
ENV HF_HOME=/cache/huggingface \
    TORCH_HOME=/cache/torch \
    TRANSFORMERS_OFFLINE=0

COPY app ./app
COPY tests ./tests

EXPOSE 8000

# Single worker: model weights are held per-process, so replicas cost real memory.
# Scale with container replicas rather than workers once the real model lands.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
