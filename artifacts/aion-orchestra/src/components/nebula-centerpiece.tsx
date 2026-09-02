import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface NebulaHandle {
  startBroadcast: (audioUrl: string) => Promise<Blob>;
  stopBroadcast: () => void;
}

export const NebulaCenterpiece = forwardRef<NebulaHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useImperativeHandle(ref, () => ({
    startBroadcast: async (audioUrl: string) => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      // 1. Capture Canvas Stream (Video)
      const stream = canvas.captureStream(30); // 30 FPS

      // 2. Prepare Audio Context to merge the track
      const audioCtx = new AudioContext();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      const destination = audioCtx.createMediaStreamDestination();
      source.connect(destination);
      source.connect(audioCtx.destination); // For local preview

      // 3. Add Audio Track to the Stream
      const audioTrack = destination.stream.getAudioTracks()[0];
      stream.addTrack(audioTrack);

      // 4. Initialize Recorder
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      return new Promise((resolve) => {
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          resolve(blob);
          source.stop();
          audioCtx.close();
        };

        recorder.start();
        source.start(0);

        // Auto-stop after duration
        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, audioBuffer.duration * 1000);
      });
    },
    stopBroadcast: () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }); // Important for captureStream
    if (!gl) return;

    const vertexShaderSource = `
      attribute vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;

    const fragmentShaderSource = `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= resolution.x / resolution.y;
        float d = length(uv);
        vec3 finalColor = vec3(0.0);
        for (float i = 0.0; i < 3.0; i++) {
          uv = fract(uv * 1.5) - 0.5;
          d = length(uv) * exp(-length(uv));
          vec3 nebula = vec3(0.0, 0.1, 0.8) * 0.5;
          vec3 energy = vec3(0.7, 0.0, 1.0) * (sin(time + i) * 0.5 + 0.5);
          vec3 col = mix(nebula, energy, sin(d * 8.0 - time) * 0.5 + 0.5);
          d = sin(d * 8.0 + time) / 8.0;
          d = abs(d);
          d = pow(0.01 / d, 1.2);
          finalColor += col * d;
        }
        gl_FragColor = vec4(finalColor * 0.7, 1.0);
      }
    `;

    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'time');
    const resLoc = gl.getUniformLocation(program, 'resolution');

    const render = (t: number) => {
      if (!canvas) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, t * 0.001);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(render);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="relative w-full h-[300px] sm:h-[450px] rounded-lg overflow-hidden cyber-card mb-8">
      <canvas ref={canvasRef} className="w-full h-full opacity-60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="font-serif text-5xl sm:text-7xl neon-text text-accent uppercase tracking-widest opacity-20">NEBULA</div>
        <div className="font-mono text-[10px] tracking-[.5em] text-primary uppercase mt-2 opacity-40">Core Neural Interface</div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
});

NebulaCenterpiece.displayName = 'NebulaCenterpiece';
