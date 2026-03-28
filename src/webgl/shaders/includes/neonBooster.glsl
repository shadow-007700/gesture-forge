vec3 boostNeon(vec3 color) {
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    float isBlack = step(lum, 0.001);
    vec3 safeColor = mix(color, vec3(1.0), isBlack);
    
    float boostFactor = (1.0 - smoothstep(0.0, 0.4, lum)) * 2.5 + 1.0; 
    return safeColor * boostFactor;
}