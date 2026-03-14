import React, { useEffect, useRef, useState } from 'react';

interface AudioLevelMeterProps {
  audioStream?: MediaStream;
  label?: string;
}

/**
 * Visualizes incoming audio volume using Web Audio API
 */
export const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({
  audioStream,
  label = 'Audio Level',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [level, setLevel] = useState(0);
  const animationIdRef = useRef<number>();

  useEffect(() => {
    if (!audioStream || !canvasRef.current) {
      return;
    }

    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    // Create analyser if not exists
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    // Create source if not exists
    if (!sourceRef.current) {
      sourceRef.current = audioContext.createMediaStreamSource(audioStream);
      sourceRef.current.connect(analyserRef.current);
    }

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average level
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedLevel = average / 255;
      setLevel(normalizedLevel);

      // Clear canvas
      ctx.fillStyle = 'rgb(20, 20, 20)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Color gradient based on height
        if (barHeight > canvas.height * 0.7) {
          ctx.fillStyle = '#ef4444'; // red
        } else if (barHeight > canvas.height * 0.4) {
          ctx.fillStyle = '#eab308'; // yellow
        } else {
          ctx.fillStyle = '#22c55e'; // green
        }

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      animationIdRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [audioStream]);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">{label}</label>
        <span className="text-xs text-gray-500">
          {Math.round(level * 100)}%
        </span>
      </div>
      <div className="bg-gray-900 border border-gray-700 rounded overflow-hidden h-16">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default AudioLevelMeter;
