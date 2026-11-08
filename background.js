const canvas = document.getElementById('bg-canvas');
const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
if (!gl) { canvas.style.display = 'none'; throw new Error('WebGL not supported'); }

// Render the soft liquid background at reduced resolution: it is blurry by
// design, and full Retina resolution made Safari drop frames.
const BG_SCALE = 0.5;
function resize() {
    canvas.width = Math.max(1, Math.round(window.innerWidth * BG_SCALE));
    canvas.height = Math.max(1, Math.round(window.innerHeight * BG_SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

const vsSource = `
    attribute vec4 aVertexPosition;
    void main() {
        gl_Position = aVertexPosition;
    }
`;

const fsSource = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform float u_time;
    uniform vec2 u_resolution;

    // --- Noise Functions ---
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
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

    // --- FBM (Fractal Brownian Motion) ---
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 3; i++) {
            value += amplitude * snoise(st);
            st *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

    void main() {
        vec2 st = gl_FragCoord.xy/u_resolution.xy;
        st.x *= u_resolution.x/u_resolution.y;
        
        // Slow, fluid speed for "Liquid Glass Vortex"
        float time = u_time * 0.15; 

        // --- Domain Warping for Continuous Liquid Field ---
        // 1. Base warping (Large flow direction)
        vec2 q = vec2(0.);
        q.x = fbm(st + 0.1 * time);
        q.y = fbm(st + vec2(1.0));

        // 2. Secondary warping (Detail & Swirl)
        // Reduced displacement intensity for "thinner" liquid feel
        vec2 r = vec2(0.);
        r.x = fbm(st + 1.0*q + vec2(1.7,9.2) + 0.15*time);
        r.y = fbm(st + 1.0*q + vec2(8.3,2.8) + 0.126*time);

        // 3. Main Noise Field (The visual texture)
        float f = fbm(st + r);

        // --- Color Palette: Clear Blue, Pale Pink, Gentle Yellow ---
        vec3 c_blue = vec3(0.68, 0.88, 1.0);
        vec3 c_pink = vec3(1.0, 0.85, 0.92);
        vec3 c_yellow = vec3(1.0, 0.92, 0.65);
        vec3 bg = vec3(0.98, 0.99, 1.0); // Light base

        // --- Mixing ---
        // Create a "Pulsating Field" rather than distinct objects
        vec3 color = bg;
        
        // Soft color infusion based on noise layers
        // Use different noise offsets to create color separation (dispersion)
        float mix1 = smoothstep(0.3, 0.8, f);
        float mix2 = smoothstep(0.3, 0.8, fbm(st + r + 2.0));
        
        // Gentle blending
        color = mix(color, c_blue, mix1 * 0.6);
        color = mix(color, c_pink, mix2 * 0.5);
        // Yellow appears where both interact
        color = mix(color, c_yellow, (mix1 * mix2) * 0.7);

        // --- Refraction / Ripples ---
        // Calculate normal for "Micro-cluster ripples"
        float eps = 0.01;
        float h = f;
        float h_x = fbm(st + r + vec2(eps, 0.0));
        float h_y = fbm(st + r + vec2(0.0, eps));
        
        // Flatter normal (0.08) for "thinner" liquid, not thick jelly
        vec3 normal = normalize(vec3(h_x - h, h_y - h, 0.08)); 
        vec3 lightDir = normalize(vec3(-0.5, -0.5, 1.0));
        
        // Specular Highlight (Glossy but soft)
        float spec = pow(max(dot(normal, lightDir), 0.0), 24.0);
        
        // Add specular (White)
        color += vec3(0.6) * spec * 0.6; 

        // Vignette
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        color *= (1.0 - length(uv - 0.5) * 0.15);

        gl_FragColor = vec4(color, 1.0);
    }
`;

function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);

const shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertexShader);
gl.attachShader(shaderProgram, fragmentShader);
gl.linkProgram(shaderProgram);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
        uTime: gl.getUniformLocation(shaderProgram, 'u_time'),
        uResolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
    },
};

let startTime = 0;
let running = true;
document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(render);
});
function render(now) {
    if (!running) return;
    if (!startTime) startTime = now;
    const currentTime = (now - startTime) * 0.001;

    gl.useProgram(programInfo.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.uniform1f(programInfo.uniformLocations.uTime, currentTime);
    gl.uniform2f(programInfo.uniformLocations.uResolution, canvas.width, canvas.height);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
