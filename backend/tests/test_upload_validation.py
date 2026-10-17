"""HL-048: uploads are checked by their real content, not by the file name or Content-Type header."""
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services.storage_service import SupabaseStorageService, detect_file_type

JPG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 64
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 64
MP4 = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00" + b"\x00" * 64
HEIC = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00" + b"\x00" * 64
HTML = b"<html><script>alert(1)</script></html>"
TEXT = b"just some notes, not a picture"


def upload(file_bytes, filename, content_type, bucket="recipes"):
    client = MagicMock()
    client.storage.from_.return_value.get_public_url.return_value = "https://example.test/file"
    res = SupabaseStorageService(client).upload_file(
        file_bytes=file_bytes, filename=filename, content_type=content_type, bucket=bucket,
        target_id="admin-1", caller_id="admin-1", caller_role="admin",
    )
    sent = client.storage.from_.return_value.upload.call_args.kwargs
    return res, sent


@pytest.mark.parametrize("data, kind", [(JPG, "image/jpeg"), (PNG, "image/png"), (WEBP, "image/webp"),
                                        (MP4, "video/mp4"), (HEIC, None), (HTML, None), (TEXT, None), (b"", None)])
def test_detects_type_from_bytes(data, kind):
    assert detect_file_type(data) == kind


@pytest.mark.parametrize("data, name, mime", [(JPG, "dish.jpg", "image/jpeg"), (PNG, "dish.png", "image/png"),
                                             (WEBP, "dish.webp", "image/webp")])
def test_real_images_are_accepted(data, name, mime):
    res, sent = upload(data, name, mime)
    assert sent["file_options"] == {"content-type": mime}
    assert res["path"].endswith(name.split(".")[0] + "." + name.split(".")[1])


@pytest.mark.parametrize("data", [HTML, TEXT])
def test_spoofed_file_with_an_image_name_is_rejected(data):
    with pytest.raises(HTTPException) as exc:
        upload(data, "photo.jpg", "image/jpeg")
    assert exc.value.status_code == 400
    assert exc.value.detail == "This file isn't a supported type. Allowed: JPG, PNG, WebP."


def test_heic_renamed_to_mp4_is_rejected():
    with pytest.raises(HTTPException) as exc:
        upload(HEIC, "clip.mp4", "video/mp4", bucket="exercises")
    assert exc.value.detail == "This file isn't a supported type. Allowed: JPG, PNG, WebP, MP4."


def test_video_is_only_allowed_where_videos_belong():
    upload(MP4, "warmup.mp4", "video/mp4", bucket="exercises")
    with pytest.raises(HTTPException):
        upload(MP4, "dish.mp4", "video/mp4", bucket="recipes")


def test_name_and_label_follow_the_real_content():
    """A PNG named .jpg and sent as image/jpeg is stored as a .png labelled image/png."""
    res, sent = upload(PNG, "dish.jpg", "image/jpeg")
    assert res["path"].endswith("_dish.png")
    assert sent["file_options"] == {"content-type": "image/png"}
