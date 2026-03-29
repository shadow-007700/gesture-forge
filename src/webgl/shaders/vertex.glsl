uniform float uTime;
uniform float uScatterForce; 
uniform float uFistProgress; 

uniform vec3 uColorIdle;
uniform vec3 uColorThumbsUp;
uniform vec3 uColorNebulaCore;
uniform vec3 uColorNebulaEdge;
uniform vec3 uColorTornadoCore;
uniform vec3 uColorTornadoEdge;

uniform float uNebulaRadius;
uniform float uThumbBuzz;
uniform float uThumbMaxSize;
uniform float uThumbBaseSize;

uniform vec2 uThumbMirror;
uniform vec2 uThumbRotation;
uniform vec2 uThumbActive;
uniform vec2 uTornadoActive; 

attribute float aRandom;
attribute vec3 aTargetPosition;
attribute float aTeam; 

varying float vVisibility;
varying vec3 vColor;

#include "./includes/neonBooster.glsl"

void main() {
    vec3 idlePos = position;
    idlePos.x += sin(uTime * 0.5 + aRandom * 10.0) * 1.5;
    idlePos.y += cos(uTime * 0.3 + aRandom * 10.0) * 1.5;
    idlePos.z += sin(uTime * 0.4 + aRandom * 10.0) * 1.5;

    // We use these 3 INDEPENDENT random values to build a 3D volume, preventing the "Squiggle" artifact!
    float rand1 = fract(sin(aRandom * 12.9898) * 43758.5453);
    float rand2 = fract(sin(aRandom * 78.2330) * 43758.5453);
    float rand3 = fract(sin(aRandom * 39.3460) * 43758.5453);

    vec3 baseShape = aTargetPosition;
    
    // --- REALISTIC VOLUMETRIC TORNADO GENERATOR ---
    float tHeightPct = rand1; 
    
    // Lowered max height to 35.0 and shifted base down to -12.0 to stop overflowing
    float tHeight = (tHeightPct * 35.0) - 12.0; 
    
    // Decreased base radius to 0.6, increased top flare to 38.0
    float maxRadius = mix(0.6, 38.0, pow(tHeightPct, 4.0));
    
    // The Debris Cloud: Adds a chaotic, chunky dust cloud at the very base
    float isDebris = 1.0 - step(0.12, tHeightPct);
    maxRadius += isDebris * (rand2 * 10.0); 

    // Volumetric Fill: Distributes particles INSIDE the funnel wall, not just a 1D shell
    // Using pow < 1.0 pushes most particles towards the outer edge, creating a hollow core!
    float r = maxRadius * pow(rand3, 0.4); 
    
    float tAngle = rand2 * 6.28318;
    
    // Adjusted spin speed back up to ~19.0 at the base based on feedback
    float tSpinSpeed = mix(19.0, 4.0, tHeightPct); 
    float curAngle = tAngle + (uTime * tSpinSpeed);
    
    vec3 mathTornado = vec3(cos(curAngle) * r, tHeight, sin(curAngle) * r);
    
    // Realistic Spine Bend: A slow, lumbering sway, like a massive storm
    mathTornado.x += sin(tHeightPct * 2.0 + uTime * 1.2) * mix(0.0, 10.0, tHeightPct);
    mathTornado.z += cos(tHeightPct * 2.5 + uTime * 1.4) * mix(0.0, 10.0, tHeightPct);

    // Chaotic wind turbulence inside the funnel
    mathTornado.x += sin(uTime * 5.0 + rand1 * 100.0) * mix(0.2, 2.0, tHeightPct);
    mathTornado.y += cos(uTime * 6.0 + rand2 * 100.0) * 0.5;
    mathTornado.z += sin(uTime * 4.5 + rand3 * 100.0) * mix(0.2, 2.0, tHeightPct);

    // --- SHAPE MIXING ---
    vec3 shapeLeft = mix(baseShape, mathTornado, uTornadoActive.x);
    vec3 shapeRight = mix(baseShape, mathTornado, uTornadoActive.y);

    // 1. LEFT HAND GHOST 
    vec3 posLeft = shapeLeft;
    posLeft.x *= uThumbMirror.x;
    float cRollL = cos(uThumbRotation.x);
    float sRollL = sin(uThumbRotation.x);
    posLeft.xy = vec2(
        posLeft.x * cRollL - posLeft.y * sRollL,
        posLeft.x * sRollL + posLeft.y * cRollL
    );
    
    // 2. RIGHT HAND GHOST
    vec3 posRight = shapeRight;
    posRight.x *= uThumbMirror.y;
    float cRollR = cos(uThumbRotation.y);
    float sRollR = sin(uThumbRotation.y);
    posRight.xy = vec2(
        posRight.x * cRollR - posRight.y * sRollR,
        posRight.x * sRollR + posRight.y * cRollR
    );
    
    // --- COMBINED ACTIVE STATES ---
    float activeLeft = max(uThumbActive.x, uTornadoActive.x);
    float activeRight = max(uThumbActive.y, uTornadoActive.y);
    
    // 3. DYNAMIC FRAMING
    float dualFactor = activeLeft * activeRight; 
    float scaleMulti = mix(1.0, 0.85, dualFactor); 
    
    // BUG FIX: Anchor the Y-axis at the bottom (-12.0) before scaling!
    // This stops the shapes from drastically floating upward when both hands are active.
    posLeft.xz *= scaleMulti;
    posLeft.y = (posLeft.y + 12.0) * scaleMulti - 12.0;
    
    posRight.xz *= scaleMulti;
    posRight.y = (posRight.y + 12.0) * scaleMulti - 12.0;
    
    posLeft.x += mix(0.0, -15.0, dualFactor);
    posRight.x += mix(0.0, 15.0, dualFactor);
    
    // 4. LOCALIZED BUZZ
    vec3 buzz = vec3(
        sin(uTime * 3.0 + aRandom * 100.0) * uThumbBuzz,
        cos(uTime * 3.3 + aRandom * 100.0) * uThumbBuzz,
        sin(uTime * 2.8 + aRandom * 100.0) * uThumbBuzz
    );
    posLeft += buzz;
    posRight += buzz;

    // --- FLUID LEAK TRANSITION ---
    vec3 fluidGravity = vec3(
        sin(uTime * 4.0 + aRandom * 50.0) * (20.0 * rand1), 
        -50.0 * rand2 - 10.0,                               
        cos(uTime * 4.0 + rand3 * 50.0) * (20.0 * rand1)    
    );

    float leakLeft = pow(sin(activeLeft * 3.14159), 0.6); 
    float leakRight = pow(sin(activeRight * 3.14159), 0.6);

    vec3 targetLeft = mix(posRight, posLeft, activeLeft) + (fluidGravity * leakLeft);
    vec3 targetRight = mix(posLeft, posRight, activeRight) + (fluidGravity * leakRight);

    vec3 myTargetPos = mix(targetLeft, targetRight, aTeam);
    
    float anyHandActive = max(activeLeft, activeRight);
    vec3 finalPos = mix(idlePos, myTargetPos, anyHandActive);

    // STATE C: THE FIST NEBULA
    float nRadius = pow(rand1, 2.5) * uNebulaRadius; 
    float nTheta = rand2 * 6.28318; 
    float nPhi = acos(2.0 * rand3 - 1.0); 

    vec3 cloudPos = vec3(
        nRadius * sin(nPhi) * cos(nTheta),
        nRadius * cos(nPhi) * 0.6, 
        nRadius * sin(nPhi) * sin(nTheta)
    );

    float distToCenter = length(cloudPos);
    float twist = -distToCenter * 0.35; 
    float s = sin(twist);
    float c = cos(twist);
    cloudPos.xz = vec2(
        cloudPos.x * c - cloudPos.z * s,
        cloudPos.x * s + cloudPos.z * c
    );

    float rot = uTime * 0.25;
    vec3 nebulaPos = vec3(
        cloudPos.x * cos(rot) - cloudPos.z * sin(rot),
        cloudPos.y + sin(uTime * 1.5 + aRandom * 10.0) * 0.2,
        cloudPos.x * sin(rot) + cloudPos.z * cos(rot)
    );

    finalPos = mix(finalPos, nebulaPos, uFistProgress);

    // --- DYNAMIC TORNADO COLORING ---
    vec3 cIdle = boostNeon(uColorIdle);
    vec3 cThumb = boostNeon(uColorThumbsUp);
    vec3 cNebCore = boostNeon(uColorNebulaCore);
    vec3 cNebEdge = boostNeon(uColorNebulaEdge);
    vec3 cTorCore = boostNeon(uColorTornadoCore);
    vec3 cTorEdge = boostNeon(uColorTornadoEdge);

    vec3 cTornado = mix(cTorCore, cTorEdge, tHeightPct); 
    
    float myTornadoActive = mix(uTornadoActive.x, uTornadoActive.y, aTeam);
    vec3 activeShapeColor = mix(cThumb, cTornado, myTornadoActive);

    vec3 baseColor = mix(cIdle, activeShapeColor, anyHandActive); 
    
    float colorMix = clamp(distToCenter / 12.0, 0.0, 1.0);
    vec3 nebulaColor = mix(cNebCore, cNebEdge, colorMix);
    
    float isStar = step(0.97, rand1);
    nebulaColor = mix(nebulaColor, vec3(1.0, 1.0, 1.0), isStar);

    vColor = mix(baseColor, nebulaColor, uFistProgress);

    // STATE D: THE EXPLOSION
    vec3 explosionDir = vec3(
        sin(nPhi) * cos(nTheta),
        sin(nPhi) * sin(nTheta),
        cos(nPhi)
    );
    
    float scatterPhase1 = clamp(uScatterForce, 0.0, 1.0);
    float scatterPhase2 = clamp(uScatterForce - 1.0, 0.0, 1.0);
    
    float speedVariance = rand2 * 0.8 + 0.2; 
    float scatterDist = (1.0 - pow(1.0 - scatterPhase1, 3.0)) * (25.0 * speedVariance);
    scatterDist *= (1.0 - step(0.001, scatterPhase2)); 
    
    finalPos += explosionDir * scatterDist;

    // --- Visibility Math ---
    float vis = 1.0;
    
    vis = mix(vis, 1.0 - step(0.18, aRandom), anyHandActive);
    vis = mix(vis, 1.0 - step(0.08, aRandom), uFistProgress);
    
    float isScattering = step(0.001, uScatterForce);
    vis = mix(vis, 1.0, isScattering);

    // Visually thin out the tornado slightly to make it look like blowing dust
    float hideInTornado = step(0.15, rand1); // Hides 15% of particles
    float tornadoThinning = mix(1.0, hideInTornado, myTornadoActive);
    vis *= tornadoThinning;

    float flashStrength = sin(scatterPhase1 * 3.14159);
    vColor = mix(vColor, vec3(1.0, 1.0, 1.0), flashStrength * isScattering);
    
    float scatterVis = abs(uScatterForce - 1.0);
    vis *= scatterVis;
    
    float dimming = mix(1.0, fract(aRandom * 333.333) * 0.7 + 0.3, uFistProgress);
    vVisibility = vis * dimming;

    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    
    // --- Dynamic Size Scaling ---
    float idleSize = 10.0 * aRandom + 5.0;
    
    float thumbRandom = fract(aRandom * 888.888);
    float morphedSize = uThumbMaxSize * pow(thumbRandom, 5.0) + uThumbBaseSize; 
    
    float randomGas = fract(aRandom * 555.555);
    float nebulaSize = 40.0 * pow(randomGas, 3.0) + 2.0; 
    
    float currentSize = mix(idleSize, morphedSize, anyHandActive);
    currentSize = mix(currentSize, nebulaSize, uFistProgress);
    
    float explosionPuff = sin(scatterPhase1 * 3.14159) * (40.0 * rand3 + 10.0); 
    currentSize += explosionPuff * isScattering; 
    
    gl_PointSize = currentSize * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}