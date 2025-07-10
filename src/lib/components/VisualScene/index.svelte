<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  
  export let backgroundImage: string = '';
  export let timeOfDay: 'dawn' | 'day' | 'dusk' | 'night' = 'day';
  
  let canvas: HTMLCanvasElement;
  let gl: WebGL2RenderingContext | null = null;
  let animationFrame: number;
  let program: WebGLProgram | null = null;
  let backgroundTexture: WebGLTexture | null = null;
  let startTime = Date.now();
  let isLoading = true;
  let hasError = false;
  
  // Vertex shader - creates a full-screen quad
  const vertexShaderSource = `#version 300 es
    precision highp float;
    
    in vec4 a_position;
    out vec2 v_uv;
    
    void main() {
      gl_Position = a_position;
      v_uv = a_position.xy * 0.5 + 0.5;
    }
  `;
  
  // Fragment shader - handles day/night transitions and background rendering
  const fragmentShaderSource = `#version 300 es
    precision highp float;
    
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float u_timeOfDay; // 0.0 = night, 0.25 = dawn, 0.5 = day, 0.75 = dusk
    uniform sampler2D u_background;
    uniform bool u_hasBackground;
    
    in vec2 v_uv;
    out vec4 fragColor;
    
    // Noise function for cloud animation
    vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec2 mod289(vec2 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec3 permute(vec3 x) {
      return mod289(((x*34.0)+1.0)*x);
    }
    
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                          0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                         -0.577350269189626,  // -1.0 + 2.0 * C.x
                          0.024390243902439); // 1.0 / 41.0
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      
      i = mod289(i); // Avoid truncation effects in permutation
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
      
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    
    // Get sky colors based on time of day
    vec3 getSkyColor(float timePhase, vec2 uv) {
      vec3 nightColor = vec3(0.02, 0.02, 0.1);
      vec3 dawnColor = vec3(1.0, 0.4, 0.2);
      vec3 dayColor = vec3(0.5, 0.7, 1.0);
      vec3 duskColor = vec3(0.8, 0.3, 0.1);
      
      vec3 skyColor;
      if (timePhase < 0.25) {
        // Night to dawn
        float t = timePhase / 0.25;
        skyColor = mix(nightColor, dawnColor, smoothstep(0.0, 1.0, t));
      } else if (timePhase < 0.5) {
        // Dawn to day
        float t = (timePhase - 0.25) / 0.25;
        skyColor = mix(dawnColor, dayColor, smoothstep(0.0, 1.0, t));
      } else if (timePhase < 0.75) {
        // Day to dusk
        float t = (timePhase - 0.5) / 0.25;
        skyColor = mix(dayColor, duskColor, smoothstep(0.0, 1.0, t));
      } else {
        // Dusk to night
        float t = (timePhase - 0.75) / 0.25;
        skyColor = mix(duskColor, nightColor, smoothstep(0.0, 1.0, t));
      }
      
      // Add gradient effect (darker at bottom)
      float gradient = 1.0 - uv.y * 0.3;
      skyColor *= gradient;
      
      return skyColor;
    }
    
    // Generate cloud layer
    vec3 getClouds(vec2 uv, float time) {
      vec2 cloudUV = uv * 3.0 + vec2(time * 0.02, time * 0.01);
      float noise1 = snoise(cloudUV) * 0.5 + 0.5;
      float noise2 = snoise(cloudUV * 2.0) * 0.25 + 0.25;
      float noise3 = snoise(cloudUV * 4.0) * 0.125 + 0.125;
      
      float clouds = noise1 + noise2 + noise3;
      clouds = smoothstep(0.4, 0.8, clouds);
      
      vec3 cloudColor = vec3(1.0);
      
      // Darken clouds based on time of day
      if (u_timeOfDay < 0.25 || u_timeOfDay > 0.75) {
        cloudColor *= 0.3; // Night clouds
      } else if (u_timeOfDay < 0.5) {
        cloudColor *= mix(0.7, 1.0, (u_timeOfDay - 0.25) / 0.25); // Dawn clouds
      } else {
        cloudColor *= mix(1.0, 0.6, (u_timeOfDay - 0.5) / 0.25); // Day to dusk clouds
      }
      
      return cloudColor * clouds;
    }
    
    void main() {
      vec2 uv = v_uv;
      vec3 color;
      
      if (u_hasBackground) {
        // Use background texture
        color = texture(u_background, uv).rgb;
        
        // Apply time-based color tinting
        vec3 tint = getSkyColor(u_timeOfDay, uv);
        color = mix(color, color * tint, 0.3);
      } else {
        // Generate procedural sky
        color = getSkyColor(u_timeOfDay, uv);
        
        // Add clouds
        vec3 clouds = getClouds(uv, u_time);
        color = mix(color, clouds, clouds.r * 0.7);
      }
      
      // Add subtle animation based on time
      float pulse = sin(u_time * 0.001) * 0.02 + 0.98;
      color *= pulse;
      
      fragColor = vec4(color, 1.0);
    }
  `;
  
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
  
  function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture | null> {
    return new Promise((resolve) => {
      const texture = gl.createTexture();
      if (!texture) {
        resolve(null);
        return;
      }
      
      const image = new Image();
      image.crossOrigin = 'anonymous';
      
      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        resolve(texture);
      };
      
      image.onerror = () => {
        console.warn('Failed to load background image:', url);
        resolve(null);
      };
      
      image.src = url;
    });
  }
  
  function initWebGL() {
    if (!canvas) return;
    
    try {
      gl = canvas.getContext('webgl2');
      if (!gl) {
        throw new Error('WebGL2 not supported');
      }
      
      // Create shaders
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      
      if (!vertexShader || !fragmentShader) {
        throw new Error('Failed to create shaders');
      }
      
      // Create program
      program = createProgram(gl, vertexShader, fragmentShader);
      if (!program) {
        throw new Error('Failed to create program');
      }
      
      // Create full-screen quad
      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
      ]);
      
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      
      const positionLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
      
      gl.useProgram(program);
      
      isLoading = false;
      hasError = false;
      startTime = Date.now();
      animate();
      
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      hasError = true;
      isLoading = false;
    }
  }
  
  function getTimeOfDayValue(timeOfDay: string): number {
    switch (timeOfDay) {
      case 'night': return 0.0;
      case 'dawn': return 0.25;
      case 'day': return 0.5;
      case 'dusk': return 0.75;
      default: return 0.5;
    }
  }
  
  function animate() {
    if (!gl || !program || !canvas) return;
    
    const currentTime = Date.now() - startTime;
    
    // Set viewport
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Clear
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Set uniforms
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeOfDayLoc = gl.getUniformLocation(program, 'u_timeOfDay');
    const backgroundLoc = gl.getUniformLocation(program, 'u_background');
    const hasBackgroundLoc = gl.getUniformLocation(program, 'u_hasBackground');
    
    gl.uniform1f(timeLoc, currentTime);
    gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
    gl.uniform1f(timeOfDayLoc, getTimeOfDayValue(timeOfDay));
    gl.uniform1i(backgroundLoc, 0);
    gl.uniform1i(hasBackgroundLoc, backgroundTexture ? 1 : 0);
    
    if (backgroundTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
    }
    
    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    animationFrame = requestAnimationFrame(animate);
  }
  
  function resizeCanvas() {
    if (!canvas) return;
    
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
  }
  
  onMount(() => {
    if (!browser) return;
    
    resizeCanvas();
    initWebGL();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    
    return () => {
      resizeObserver.disconnect();
    };
  });
  
  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
    if (gl && program) {
      gl.deleteProgram(program);
    }
    if (gl && backgroundTexture) {
      gl.deleteTexture(backgroundTexture);
    }
  });
  
  // Load background image when prop changes
  $: if (gl && backgroundImage) {
    loadTexture(gl, backgroundImage).then(texture => {
      if (backgroundTexture) {
        gl!.deleteTexture(backgroundTexture);
      }
      backgroundTexture = texture;
    });
  }
</script>

<div class="visual-scene" class:loading={isLoading} class:error={hasError}>
  {#if hasError}
    <div class="fallback">
      <div class="fallback-content">
        <p>WebGL not available</p>
        <p class="fallback-subtitle">Using fallback visuals</p>
      </div>
    </div>
  {:else}
    <canvas bind:this={canvas} />
    {#if isLoading}
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading visual scene...</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .visual-scene {
    position: relative;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #191414 0%, #2a2a2a 100%);
    overflow: hidden;
  }
  
  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
  
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(25, 20, 20, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    backdrop-filter: blur(10px);
  }
  
  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid rgba(29, 185, 84, 0.3);
    border-top: 3px solid var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  .loading-overlay p {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }
  
  .fallback {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #191414 0%, #2a2a2a 50%, #191414 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .fallback-content {
    text-align: center;
    color: var(--color-muted);
  }
  
  .fallback-content p {
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
  }
  
  .fallback-subtitle {
    font-size: 0.75rem !important;
    opacity: 0.7;
    margin-top: 0.5rem !important;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .visual-scene {
      background: #000000;
    }
    
    .loading-overlay {
      background: rgba(0, 0, 0, 0.95);
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .loading-spinner {
      animation: none;
      border: 3px solid var(--color-primary);
    }
  }
</style> 