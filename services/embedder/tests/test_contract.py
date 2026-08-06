"""Contract tests.

Every test here asserts an invariant from docs/embedding-service-contract.md against
whatever model is currently wired into app/model.py. They are model-agnostic on
purpose: they must keep passing when the stub is replaced by a real encoder.

A failure here is a broken build, not a tuning issue.

    python -m pytest services/embedder/tests/ -v
"""

from __future__ import annotations

import base64
import io
import math

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import model as m
from app.main import MAX_BATCH_ITEMS, NORM_TOLERANCE, app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:  # context manager triggers lifespan/model load
        yield c


def _png(color: tuple[int, int, int], size: tuple[int, int] = (64, 64)) -> str:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _embed_images(client, items) -> dict:
    resp = client.post("/embed/images", json={"items": items})
    assert resp.status_code == 200, resp.text
    return resp.json()


def _vectors(body: dict) -> list[list[float]]:
    out = []
    for r in body["results"]:
        assert r["error"] is None, f"unexpected error for {r['id']}: {r['error']}"
        out.append(r["vector"])
    return out


# --- /health -----------------------------------------------------------------


def test_health_declares_identity(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    for field in (
        "model_id",
        "embedding_dim",
        "revision",
        "normalized",
        "modalities",
        "shared_space",
    ):
        assert field in body, f"/health is missing required field '{field}'"
    assert isinstance(body["embedding_dim"], int) and body["embedding_dim"] > 0
    assert body["revision"], "revision must be a non-empty string (contract §4)"


def test_health_declares_normalized_true(client):
    # Contract §3.1 — v1 requires the service to normalize.
    assert client.get("/health").json()["normalized"] is True


# --- §3.1 unit norm ----------------------------------------------------------


def test_vectors_are_l2_normalized(client):
    body = _embed_images(
        client, [{"id": "a", "data": _png((255, 0, 0))}, {"id": "b", "data": _png((0, 128, 255))}]
    )
    for vec in _vectors(body):
        norm = math.sqrt(sum(v * v for v in vec))
        assert abs(norm - 1.0) <= NORM_TOLERANCE, f"norm was {norm}, expected 1.0"


# --- §3.2 fixed dimension, finite values -------------------------------------


def test_dimension_matches_health_and_values_are_finite(client):
    dim = client.get("/health").json()["embedding_dim"]
    body = _embed_images(client, [{"id": "a", "data": _png((10, 20, 30))}])
    assert body["embedding_dim"] == dim
    vec = _vectors(body)[0]
    assert len(vec) == dim
    assert all(math.isfinite(v) for v in vec)


# --- §3.3 determinism --------------------------------------------------------


def test_same_input_yields_same_vector(client):
    data = _png((77, 88, 99))
    first = _vectors(_embed_images(client, [{"id": "x", "data": data}]))[0]
    second = _vectors(_embed_images(client, [{"id": "x", "data": data}]))[0]
    for a, b in zip(first, second):
        assert abs(a - b) < 1e-4, "same input produced different vectors across calls"


def test_different_inputs_yield_different_vectors(client):
    body = _embed_images(
        client, [{"id": "a", "data": _png((0, 0, 0))}, {"id": "b", "data": _png((255, 255, 255))}]
    )
    a, b = _vectors(body)
    assert a != b, "distinct images collapsed to an identical vector"


# --- §3.4 batch independence -------------------------------------------------


def test_batching_does_not_change_vectors(client):
    a_data, b_data = _png((1, 2, 3)), _png((200, 100, 50))

    batched = _vectors(
        _embed_images(client, [{"id": "a", "data": a_data}, {"id": "b", "data": b_data}])
    )
    alone_a = _vectors(_embed_images(client, [{"id": "a", "data": a_data}]))[0]
    alone_b = _vectors(_embed_images(client, [{"id": "b", "data": b_data}]))[0]

    for got, want in ((batched[0], alone_a), (batched[1], alone_b)):
        for x, y in zip(got, want):
            assert abs(x - y) < 1e-4, "vector depended on what else was in the batch"


# --- ordering ----------------------------------------------------------------


def test_results_preserve_request_order(client):
    ids = ["first", "second", "third"]
    body = _embed_images(
        client, [{"id": i, "data": _png((n * 40, 0, 0))} for n, i in enumerate(ids)]
    )
    assert [r["id"] for r in body["results"]] == ids


# --- §3.6 per-item failure isolation -----------------------------------------


def test_corrupt_item_does_not_fail_the_batch(client):
    resp = client.post(
        "/embed/images",
        json={
            "items": [
                {"id": "good", "data": _png((5, 5, 5))},
                {"id": "bad", "data": base64.b64encode(b"not an image").decode()},
                {"id": "also-good", "data": _png((9, 9, 9))},
            ]
        },
    )
    assert resp.status_code == 200, "a corrupt item must not fail the whole request"
    by_id = {r["id"]: r for r in resp.json()["results"]}

    assert by_id["bad"]["vector"] is None
    assert by_id["bad"]["error"]["code"] in {"DECODE_FAILED", "UNSUPPORTED_FORMAT"}
    assert by_id["good"]["vector"] is not None
    assert by_id["also-good"]["vector"] is not None


def test_empty_payload_is_reported_per_item(client):
    resp = client.post("/embed/images", json={"items": [{"id": "empty", "data": ""}]})
    assert resp.status_code == 200
    assert resp.json()["results"][0]["error"]["code"] == "EMPTY_INPUT"


# --- request-level validation is 4xx -----------------------------------------


def test_empty_batch_is_rejected(client):
    assert client.post("/embed/images", json={"items": []}).status_code == 400


def test_oversized_batch_is_rejected(client):
    items = [{"id": f"i{n}", "data": _png((n, n, n))} for n in range(MAX_BATCH_ITEMS + 1)]
    assert client.post("/embed/images", json={"items": items}).status_code == 400


def test_duplicate_ids_are_rejected(client):
    items = [{"id": "dup", "data": _png((1, 1, 1))}, {"id": "dup", "data": _png((2, 2, 2))}]
    assert client.post("/embed/images", json={"items": items}).status_code == 400


# --- preprocessing robustness (ds-handoff §4.4) ------------------------------


@pytest.mark.parametrize("mode", ["RGBA", "L", "P", "CMYK"])
def test_non_rgb_colour_modes_are_handled(client, mode):
    buf = io.BytesIO()
    Image.new(mode, (48, 48)).save(buf, format="PNG" if mode != "CMYK" else "TIFF")
    payload = base64.b64encode(buf.getvalue()).decode()

    resp = client.post("/embed/images", json={"items": [{"id": mode, "data": payload}]})
    assert resp.status_code == 200
    result = resp.json()["results"][0]
    assert result["error"] is None, f"{mode} images must be converted, not rejected"


# --- text modality -----------------------------------------------------------


@pytest.mark.skipif("text" not in m.MODALITIES, reason="model has no text modality")
def test_text_vectors_satisfy_the_same_invariants(client):
    resp = client.post(
        "/embed/text",
        json={"items": [{"id": "q1", "text": "red leather ankle boot"}]},
    )
    assert resp.status_code == 200
    vec = resp.json()["results"][0]["vector"]
    assert len(vec) == m.EMBEDDING_DIM
    norm = math.sqrt(sum(v * v for v in vec))
    assert abs(norm - 1.0) <= NORM_TOLERANCE


@pytest.mark.skipif("text" not in m.MODALITIES, reason="model has no text modality")
def test_blank_text_is_reported_per_item(client):
    resp = client.post("/embed/text", json={"items": [{"id": "blank", "text": "   "}]})
    assert resp.status_code == 200
    assert resp.json()["results"][0]["error"]["code"] == "EMPTY_INPUT"


# --- §3.5 shared space -------------------------------------------------------
# Semantic quality is measured by the evaluation harness (ds-handoff §5), not here.
# This test only asserts the two spaces are dimensionally comparable, which is the
# part the backend depends on structurally.


@pytest.mark.skipif(
    not m.SHARED_SPACE or "text" not in m.MODALITIES,
    reason="model does not claim a shared image/text space",
)
def test_image_and_text_vectors_are_comparable(client):
    img = _vectors(_embed_images(client, [{"id": "i", "data": _png((120, 60, 30))}]))[0]
    txt = client.post("/embed/text", json={"items": [{"id": "t", "text": "a boot"}]})
    txt_vec = txt.json()["results"][0]["vector"]

    assert len(img) == len(txt_vec) == m.EMBEDDING_DIM
    dot = sum(a * b for a, b in zip(img, txt_vec))
    assert -1.0 - 1e-6 <= dot <= 1.0 + 1e-6, "inner product outside [-1, 1]"
