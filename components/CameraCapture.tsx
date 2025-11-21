import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onRetake: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onRetake }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Không thể truy cập camera. Vui lòng cấp quyền.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to Base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImage(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setImage(null);
    onRetake();
    startCamera();
  };

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center text-sm border border-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      <div className="relative w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-inner border-2 border-white">
        {!image ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
          />
        ) : (
          <img 
            src={image} 
            alt="Captured" 
            className="w-full h-full object-cover transform scale-x-[-1]" 
          />
        )}
        
        {/* Hidden Canvas for Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay Guides */}
        {!image && (
          <div className="absolute inset-0 border-4 border-white/30 rounded-full m-8 pointer-events-none border-dashed" />
        )}
      </div>

      <div className="mt-4 flex gap-4">
        {!image ? (
          <button
            onClick={capturePhoto}
            className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full shadow-lg active:bg-blue-700 transition-all ring-4 ring-blue-100"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        ) : (
          <div className="flex gap-3">
             <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium active:bg-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Chụp lại
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium border border-green-200">
              <CheckCircle className="w-4 h-4" />
              Đã lưu
            </div>
          </div>
        )}
      </div>
    </div>
  );
};