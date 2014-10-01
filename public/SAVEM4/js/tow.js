// Copyright 2014, SRI International
// tow.js
var TOW = { REVISION: '0.1' };

TOW.Fov = 40;
TOW.Near = 0.1;
TOW.Far = 10000;
TOW.ContainerWidth = window.innerWidth;
TOW.ContainerHeight = window.innerHeight;

TOW.Canvas = undefined;
TOW.Scene = new THREE.Scene();
TOW.Camera =  new THREE.PerspectiveCamera(TOW.Fov, TOW.ContainerWidth / TOW.ContainerHeight, TOW.Near, TOW.Far);;
TOW.Renderer = new THREE.WebGLRenderer({ width: TOW.ContainerWidth, height: TOW.ContainerHeight, antialias: true });
TOW.Loader = new THREE.ColladaLoader();

TOW.Loader.options.convertUpAxis = true;
TOW.Renderer.setSize(TOW.ContainerWidth, TOW.ContainerHeight);

TOW.changeContainerById = function(id) {
  var container = document.getElementById(id);

  TOW.ContainerWidth = container.style.width;
  TOW.ContainerHeight = container.style.height;
  TOW.Camera =  new THREE.PerspectiveCamera(TOW.Fov, TOW.ContainerWidth / TOW.ContainerHeight, TOW.Near, TOW.Far);;

  if (container.tagName == 'CANVAS') {
    TOW.Canvas = container;
    TOW.Renderer = new THREE.WebGLRenderer({ canvas: TOW.Canvas, width: TOW.ContainerWidth, height: TOW.ContainerHeight, antialias: true });
  } else {
    TOW.Renderer = new THREE.WebGLRenderer({ width: TOW.ContainerWidth, height: TOW.ContainerHeight, antialias: true });
    container.appendChild(renderer.domElement);
  }

  TOW.Renderer.setSize(TOW.ContainerWidth, TOW.ContainerHeight);
};

TOW.addGrid = function(size, step, lineColor) {
  var geometry = new THREE.Geometry();
  var material = new THREE.LineBasicMaterial({ color: lineColor });
  var line = new THREE.Line(geometry, material, THREE.LinePieces);

  for (var i = -size; i <= size; i += step) {
    geometry.vertices.push(new THREE.Vector3(-size, - 0.04, i));
    geometry.vertices.push(new THREE.Vector3(size, - 0.04, i));
    geometry.vertices.push(new THREE.Vector3(i, - 0.04, -size));
    geometry.vertices.push(new THREE.Vector3(i, - 0.04, size));
  }

  TOW.Scene.add(line);
};

TOW.addLight = function(options) {
  options = options || { };

  var color = options.color || 0xffffff;
  var light = new THREE.DirectionalLight(color, options.intensity);

  switch (options.type) {
  case 'Ambient':
    light = new THREE.AmbientLight(color);
    break;
  case 'Directional':
    light = new THREE.DirectionalLight(color, options.intensity);
    break;
  case 'Point':
    light = new THREE.PointLight(color, options.intensity, options.distance);
    break;
  }

  if (options.type != 'ambient') light.position = options.position || new THREE.Vector3(-1, 1, -1);

  TOW.Scene.add(light);
};

TOW.loadCollada = function(url, rootName, onLoad) {
  TOW.Loader.load(url, function(collada) {
    collada.scene.name = rootName;
    TOW.Scene.add(collada.scene);

    if (onLoad !== undefined) onLoad(collada.scene);
  });
};

TOW.loadColladas = function(urls, onLoaded) {
  var count = urls.length;
  var daeObj3Ds = [ ];

  var onCompleted = function(daeObj3D) {
    daeObj3Ds.push(daeObj3D);

    if (--count == 0) onLoaded(daeObj3Ds);
  };

  urls.forEach(function(url) {
    var parts = url.split('/');
    var name = parts[ parts.length - 1 ].replace('.', '_');

    TOW.loadCollada(url, name, onCompleted);
  });
};

TOW.centerGeometry = function(mesh) {
  var delta = THREE.GeometryUtils.center(mesh.geometry.clone());

  console.log(delta);
  THREE.SceneUtils.detach(mesh, mesh.parent, TOW.Scene);
  mesh.geometry.applyMatrix(new THREE.Matrix4().setPosition(delta));
  mesh.position.set(0, 0, 0);
};

TOW.findMeshAndHideChildren = function(name, scene) {
  var mesh;

  scene.traverse(function(child) {
    if (child instanceof THREE.Mesh && child.name == name) {
      mesh = child;
    } else {
      child.visible = false;
    }
  });
  return mesh;
};

TOW.unhideSceneMesh = function(name, scene) {
  scene = scene || TOW.Scene;
  scene.traverse(function(child) {
    if (child instanceof THREE.Mesh && child.name == name) child.visible = true;
  });
};

TOW.hideSceneChildren = function(scene) {
  scene.traverse(function(child) {
    child.visible = false;
  });
};

TOW.render = function(onRender) {
  if (TOW.Canvas === undefined) document.body.appendChild(TOW.Renderer.domElement);

  var render = function(t) {
    requestAnimationFrame(render);

    if (onRender !== undefined) onRender();

    TOW.Renderer.render(TOW.Scene, TOW.Camera);
  };

  render();
};
