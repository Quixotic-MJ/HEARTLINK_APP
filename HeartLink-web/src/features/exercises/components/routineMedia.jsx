import { useState } from "react";
import { Dumbbell, ExternalLink, Play } from "lucide-react";
import { BASE_URL } from "../../../lib/api.js";
import { isRoutineVideo, resolveRoutineMediaUrl } from "../exerciseMedia.js";

export function RoutineMedia({
  image,
  video,
  controls = false,
  imageFailed = false,
  onImageError,
}) {
  const [failedImage, setFailedImage] = useState(null);
  const [failedVideo, setFailedVideo] = useState(null);
  const cover = resolveRoutineMediaUrl(image, BASE_URL);
  const videoLink = resolveRoutineMediaUrl(video, BASE_URL);
  const nativeVideo = isRoutineVideo(cover)
    ? cover
    : isRoutineVideo(videoLink)
      ? videoLink
      : "";
  const photo =
    cover && !isRoutineVideo(cover) && !imageFailed && failedImage !== cover
      ? cover
      : "";
  const playable = nativeVideo && failedVideo !== nativeVideo;
  const link = videoLink || nativeVideo;
  return (
    <div
      className={`routine-media ${controls ? "routine-media--controls" : ""}`}
    >
      {controls && playable ? (
        <video
          src={nativeVideo}
          controls
          playsInline
          preload="metadata"
          poster={photo || undefined}
          aria-label="Routine demonstration"
          onError={() => setFailedVideo(nativeVideo)}
        >
          Your browser cannot play this video.
        </video>
      ) : photo ? (
        <img
          src={photo}
          alt={controls ? "Routine demonstration" : ""}
          loading="lazy"
          decoding="async"
          onError={() => {
            setFailedImage(cover);
            onImageError?.();
          }}
        />
      ) : !controls && playable ? (
        <video
          src={nativeVideo}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
          onError={() => setFailedVideo(nativeVideo)}
        />
      ) : link ? (
        <Play size={40} strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Dumbbell size={44} strokeWidth={1.5} aria-hidden="true" />
      )}
      {!controls && link && (photo || playable) && (
        <span
          className="routine-media-video-badge"
          aria-label="Video available"
        >
          <Play size={12} fill="currentColor" aria-hidden="true" />
        </span>
      )}
      {controls && link && !playable && (
        <a
          className="routine-media-link"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open instructional video
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
