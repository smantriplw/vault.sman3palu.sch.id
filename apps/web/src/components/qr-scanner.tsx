import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

interface QrScannerProps {
  onResult: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function QrScanner({ onResult, onError, className }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const doneRef = useRef(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCam, setSelectedCam] = useState<string>("");
  const [status, setStatus] = useState("Starting camera...");
  const [active, setActive] = useState(true);

  function stop() {
    cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const video = devices.filter((d) => d.kind === "videoinput");
      setCameras(video);
      if (video.length > 0) setSelectedCam(video[0].deviceId);
    });
  }, []);

  useEffect(() => {
    if (!active || !selectedCam) return;

    doneRef.current = false;
    let mounted = true;

    async function init() {
      try {
        const constraints: MediaStreamConstraints = {
          video: { deviceId: { exact: selectedCam } },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        if (!mounted) {
          stop();
          return;
        }

        setStatus("Scanning...");
        scan();
      } catch {
        if (!mounted) return;
        setStatus("Camera access denied or unavailable");
        onError?.("Camera access denied or unavailable");
      }
    }

    function scan() {
      if (doneRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        animRef.current = requestAnimationFrame(scan);
        return;
      }
      if (video.readyState < video.HAVE_ENOUGH_DATA) {
        animRef.current = requestAnimationFrame(scan);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animRef.current = requestAnimationFrame(scan);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        const d = code.data.trim();
        if (
          d.startsWith("otpauth://") ||
          d.startsWith("otpauth-migration://")
        ) {
          doneRef.current = true;
          setStatus("QR detected!");
          onResult(d);
          return;
        }
      }

      animRef.current = requestAnimationFrame(scan);
    }

    init();
    return () => {
      mounted = false;
      stop();
    };
  }, [active, selectedCam, onResult, onError]);

  return (
    <div className={className}>
      <div
        className="relative bg-black rounded-xl overflow-hidden"
        style={{ minHeight: 280 }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 border-[3px] border-dashed border-white/40 rounded-xl m-8 pointer-events-none" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
            {status}
          </span>
          {cameras.length > 1 && (
            <select
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
              className="text-xs bg-black/70 text-white border border-white/20 rounded px-2 py-1"
            >
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
