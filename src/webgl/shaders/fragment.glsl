varying float vVisibility;
varying vec3 vColor;

void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    if (distanceToCenter > 0.5) discard;
    
    float alpha = (0.5 / distanceToCenter - 1.0) * vVisibility;
    if (alpha <= 0.0) discard;
    
    gl_FragColor = vec4(vColor, alpha * 0.6); 
}