//This file is automatically rebuilt by the Cesium build process.
/*global define*/
define(function() {
"use strict";
return "uniform vec4 lightColor;\n\
uniform vec4 darkColor;\n\
uniform float frequency;\n\
czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
czm_material material = czm_getDefaultMaterial(materialInput);\n\
vec2 F = czm_cellular(materialInput.st * frequency);\n\
float t = 0.1 + (F.y - F.x);\n\
vec4 color = mix(lightColor, darkColor, t);\n\
material.diffuse = color.rgb;\n\
material.alpha = color.a;\n\
return material;\n\
}\n\
";
});