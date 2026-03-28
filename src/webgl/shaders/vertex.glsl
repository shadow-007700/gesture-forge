uniform float uTime;
uniform float uMorphProgress;
uniform float uScatterForce; 
uniform float uFistProgress; 

uniform vec3 uColorIdle;
uniform vec3 uColorThumbsUp;
uniform vec3 uColorNebulaCore;
uniform vec3 uColorNebulaEdge;

uniform float uNebulaRadius;
uniform float uThumbBuzz;
uniform float uThumbMaxSize;
uniform float uThumbBaseSize;

attribute float aRandom;
attribute vec3 aTargetPosition;

varying float vVisibility;
varying vec3 vColor;

#include "./includes/neonBooster.glsl"

void main() {
    // STATE A: Idle floating
    vec3 idlePos = position;
    idlePos.x += sin(uTime * 0.5 + aRandom * 10.0) * 1.5;
    idlePos.y += cos(uTime * 0.3 + aRandom * 10.0) * 1.5;
    idlePos.z += sin(uTime * 0.4 + aRandom * 10.0) * 1.5;

    // STATE B: Target Shape (The Hand)
    vec3 targetPos = aTargetPosition;
    
    targetPos.x += sin(uTime * 3.0 + aRandom * 100.0) * uThumbBuzz;
    targetPos.y += cos(uTime * 3.3 + aRandom * 100.0) * uThumbBuzz;
    targetPos.z += sin(uTime * 2.8 + aRandom * 100.0) * uThumbBuzz;

    vec3 finalPos = mix(idlePos, targetPos, uMorphProgress);

    // --- TRUE CHAOS RANDOMNESS ---
    float rand1 = fract(sin(aRandom * 12.9898) * 43758.5453);
    float rand2 = fract(sin(aRandom * 78.2330) * 43758.5453);
    float rand3 = fract(sin(aRandom * 39.3460) * 43758.5453);

    // STATE C: THE FIST NEBULA (Volumetric Swirl)
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

    // --- DYNAMIC IONIZED COLORING ---
    vec3 cIdle = boostNeon(uColorIdle);
    vec3 cThumb = boostNeon(uColorThumbsUp);
    vec3 cNebCore = boostNeon(uColorNebulaCore);
    vec3 cNebEdge = boostNeon(uColorNebulaEdge);

    vec3 baseColor = mix(cIdle, cThumb, uMorphProgress); 
    
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
    
    vis = mix(vis, 1.0 - step(0.18, aRandom), uMorphProgress);
    vis = mix(vis, 1.0 - step(0.08, aRandom), uFistProgress);
    
    float isScattering = step(0.001, uScatterForce);
    vis = mix(vis, 1.0, isScattering);

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
    
    float currentSize = mix(idleSize, morphedSize, uMorphProgress);
    currentSize = mix(currentSize, nebulaSize, uFistProgress);
    
    float explosionPuff = sin(scatterPhase1 * 3.14159) * (40.0 * rand3 + 10.0); 
    currentSize += explosionPuff * isScattering; 
    
    gl_PointSize = currentSize * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}