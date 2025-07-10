<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  export let timeOfDay: 'dawn' | 'day' | 'dusk' | 'night' = 'day';
  export let transitionDuration = 2000; // milliseconds

  let canvas: HTMLCanvasElement;
  let gl: WebGL2RenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let animationId: number;
  let isLoaded = false;
  let error: string | null = null;

  // Shader sources
  const vertexShaderSource = `#version 300 es
    in vec4 a_position;
    in vec2 a_texcoord;
    
    out vec2 v_texcoord;
    
    void main() {
      gl_Position = a_position;
      v_texcoord = a_texcoord;
    }
  `;

  const fragmentShaderSource = `#version 300 es
    precision highp float;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_timeOfDay; // 0=dawn, 0.33=day, 0.66=dusk, 1=night
    uniform float u_transition;
    
    in vec2 v_texcoord;
    out vec4 fragColor;
    
    // Hash function for noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    // Smooth noise
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    // Fractional Brownian Motion
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 2.0;
      
      for(int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return value;
    }
    
    // Time-based colors
    vec3 getDawnColors() {
      return vec3(0.9, 0.4, 0.2); // Warm orange
    }
    
    vec3 getDayColors() {
      return vec3(0.4, 0.7, 1.0); // Bright blue
    }
    
    vec3 getDuskColors() {
      return vec3(0.6, 0.2, 0.8); // Purple
    }
    
    vec3 getNightColors() {
      return vec3(0.1, 0.1, 0.3); // Dark blue
    }
    
    void main() {
      vec2 st = v_texcoord;
      vec2 pos = st * 4.0;
      
      // Animated background
      float t = u_time * 0.0005;
      float cloudiness = fbm(pos + vec2(t, t * 0.5));
      
      // Color based on time of day
      vec3 baseColor;
      if(u_timeOfDay < 0.25) {
        // Dawn
        baseColor = mix(getNightColors(), getDawnColors(), u_timeOfDay * 4.0);
      } else if(u_timeOfDay < 0.5) {
        // Day
        baseColor = mix(getDawnColors(), getDayColors(), (u_timeOfDay - 0.25) * 4.0);
      } else if(u_timeOfDay < 0.75) {
        // Dusk
        baseColor = mix(getDayColors(), getDuskColors(), (u_timeOfDay - 0.5) * 4.0);
      } else {
        // Night
        baseColor = mix(getDuskColors(), getNightColors(), (u_timeOfDay - 0.75) * 4.0);
      }
      
      // Add clouds/atmosphere effect
      float cloud = smoothstep(0.3, 0.7, cloudiness);
      vec3 cloudColor = baseColor * 1.2;
      vec3 finalColor = mix(baseColor, cloudColor, cloud * 0.3);
      
      // Add subtle gradient
      float gradient = 1.0 - st.y * 0.3;
      finalColor *= gradient;
      
      // Smooth transition effect
      finalColor = mix(finalColor, finalColor * 0.8, u_transition);
      
      fragColor = vec4(finalColor, 1.0);
    }
  `;

  let startTime = 0;
  let currentTimeOfDay = 0;
  let targetTimeOfDay = 0;
  let transitionStartTime = 0;
  let isTransitioning = false;

  function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }

  function initWebGL(): boolean {
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        powerPreference: 'low-power'
      });
      
      if (!gl) {
        error = 'WebGL2 not supported';
        return false;
      }

      // Create shaders
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      
      if (!vertexShader || !fragmentShader) {
        error = 'Failed to create shaders';
        return false;
      }

      // Create program
      program = createProgram(gl, vertexShader, fragmentShader);
      if (!program) {
        error = 'Failed to create shader program';
        return false;
      }

      // Create full-screen quad
      const positions = new Float32Array([
        -1, -1,  0, 0,
         1, -1,  1, 0,
        -1,  1,  0, 1,
         1,  1,  1, 1,
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const positionLocation = gl.getAttribLocation(program, 'a_position');
      const texcoordLocation = gl.getAttribLocation(program, 'a_texcoord');

      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);

      gl.enableVertexAttribArray(texcoordLocation);
      gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 16, 8);

      return true;
    } catch (err) {
      error = `WebGL initialization failed: ${err}`;
      return false;
    }
  }

  function resizeCanvas() {
    if (!canvas || !gl) return;
    
    const rect = canvas.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function getTimeOfDayValue(tod: string): number {
    switch (tod) {
      case 'dawn': return 0.0;
      case 'day': return 0.33;
      case 'dusk': return 0.66;
      case 'night': return 1.0;
      default: return 0.33;
    }
  }

  function render(timestamp: number) {
    if (!gl || !program) return;

    if (startTime === 0) startTime = timestamp;
    const elapsed = timestamp - startTime;

    // Handle time of day transitions
    if (isTransitioning) {
      const transitionElapsed = timestamp - transitionStartTime;
      const progress = Math.min(transitionElapsed / transitionDuration, 1);
      
      currentTimeOfDay = currentTimeOfDay + (targetTimeOfDay - currentTimeOfDay) * progress;
      
      if (progress >= 1) {
        isTransitioning = false;
        currentTimeOfDay = targetTimeOfDay;
      }
    }

    gl.useProgram(program);
    
    // Set uniforms
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeOfDayLocation = gl.getUniformLocation(program, 'u_timeOfDay');
    const transitionLocation = gl.getUniformLocation(program, 'u_transition');
    
    gl.uniform1f(timeLocation, elapsed);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeOfDayLocation, currentTimeOfDay);
    gl.uniform1f(transitionLocation, isTransitioning ? 0.2 : 0.0);
    
    // Clear and draw
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    animationId = requestAnimationFrame(render);
  }

  function handleResize() {
    resizeCanvas();
  }

  onMount(() => {
    if (!browser) return;

    // Initialize WebGL
    if (initWebGL()) {
      currentTimeOfDay = getTimeOfDayValue(timeOfDay);
      targetTimeOfDay = currentTimeOfDay;
      
      resizeCanvas();
      render(0);
      isLoaded = true;
      
      window.addEventListener('resize', handleResize);
    }
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (browser) {
      window.removeEventListener('resize', handleResize);
    }
  });

  // Watch for time of day changes
  $: if (browser && isLoaded) {
    const newTimeOfDay = getTimeOfDayValue(timeOfDay);
    if (Math.abs(newTimeOfDay - targetTimeOfDay) > 0.01) {
      targetTimeOfDay = newTimeOfDay;
      isTransitioning = true;
      transitionStartTime = performance.now();
    }
  }
</script>

{#if error}
  <div class="error-fallback">
    <div class="error-content">
      <h3>Visual Scene Unavailable</h3>
      <p>Using fallback background</p>
    </div>
  </div>
{:else}
  <canvas 
    bind:this={canvas}
    class="webgl-canvas"
    class:loading={!isLoaded}
  ></canvas>
{/if}

<style>
  .webgl-canvas {
    width: 100%;
    height: 100%;
    display: block;
    transition: opacity 0.3s ease;
  }

  .webgl-canvas.loading {
    opacity: 0;
  }

  .error-fallback {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, 
      var(--color-bg) 0%, 
      color-mix(in srgb, var(--color-bg) 80%, var(--color-primary) 20%) 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .error-fallback::before {
    content: '';
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(29, 185, 84, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(29, 185, 84, 0.05) 0%, transparent 50%);
    animation: subtle-pulse 8s ease-in-out infinite;
  }

  .error-content {
    text-align: center;
    color: var(--color-muted);
    z-index: 1;
  }

  .error-content h3 {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    font-weight: 500;
  }

  .error-content p {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  @keyframes subtle-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
</style> 