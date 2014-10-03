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

TOW.ColladaScenes = { };
TOW.Loader.options.convertUpAxis = true;
TOW.Renderer.setSize(TOW.ContainerWidth, TOW.ContainerHeight);

TOW.changeContainerById = function(id) {
  var container = document.getElementById(id);

  TOW.ContainerWidth = container.clientWidth; //style.width;
  TOW.ContainerHeight = container.clientHeight; //style.height;
  TOW.Camera =  new THREE.PerspectiveCamera(TOW.Fov, TOW.ContainerWidth / TOW.ContainerHeight, TOW.Near, TOW.Far);;

  if (container.tagName == 'CANVAS') {
    TOW.Renderer = new THREE.WebGLRenderer({ canvas: TOW.Canvas, width: TOW.ContainerWidth, height: TOW.ContainerHeight, antialias: true });
    TOW.Renderer.setSize(TOW.ContainerWidth, TOW.ContainerHeight);
  } else {
    TOW.Renderer = new THREE.WebGLRenderer({ width: TOW.ContainerWidth, height: TOW.ContainerHeight, antialias: true });
    TOW.Renderer.setSize(TOW.ContainerWidth, TOW.ContainerHeight);
    container.appendChild(TOW.Renderer.domElement);
  }

  TOW.Canvas = container;
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
  return line;
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
  return light;
};

TOW.loadCollada = function(url, rootName, visible, onLoad) {
  TOW.Loader.load(url, function(collada) {
    collada.scene.name = rootName;
    TOW.Scene.add(collada.scene);
    TOW.ColladaScenes[ rootName ] = collada.scene;
    
    if (!visible) TOW.invisibleSceneChildren(collada.scene);
    if (onLoad !== undefined) onLoad(collada.scene);
  });
};

TOW.loadColladas = function(urls, visible, onLoaded) {
  var count = urls.length;
  var daeObj3Ds = [ ];

  var onCompleted = function(daeObj3D) {
    daeObj3Ds.push(daeObj3D);

    if (--count == 0 && onLoaded !== undefined) onLoaded(daeObj3Ds);
  };

  urls.forEach(function(url) {
    var parts = url.split('/');
    var name = parts[ parts.length - 1 ].replace('.', '_');

    TOW.loadCollada(url, name, visible, onCompleted);
  });
};

// XXX there is a strange bug were it works for the one mesh in a collada scene, the first, but for the next.
// subsequent calls do not center, suspect in THREE.GeometryUtils.center it does
//    geometry.applyMatrix( new THREE.Matrix4().makeTranslation( offset.x, offset.y, offset.z ) );
// why is clone not preventing it, need deep clone?
TOW.centerGeometry = function(mesh, scene) {
  scene = scene || TOW.Scene;
  THREE.SceneUtils.detach(mesh, mesh.parent, scene);

  var delta = THREE.GeometryUtils.center(mesh.geometry.clone());

  mesh.geometry.applyMatrix(new THREE.Matrix4().setPosition(delta));
  mesh.position.set(0, 0, 0);
};

TOW.centerGeometryOffsetPivot = function(mesh, scene) {
  scene = scene || TOW.Scene;
  mesh.position.set(0, 0, 0);

  var offset = new THREE.Object3D();
  var pivot = new THREE.Object3D();
  var delta = THREE.GeometryUtils.center(mesh.geometry.clone());

  offset.applyMatrix(new THREE.Matrix4().setPosition(delta));
  mesh.parent.remove(mesh);
  offset.add(mesh);
  pivot.add(offset);
  scene.add(pivot);
};

TOW.findMeshAndInvisibleChildren = function(name, scene) {
  scene = scene || TOW.Scene;

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

TOW.findMeshAndVisibleMesh = function(name, scene) {
  scene = scene || TOW.Scene;

  var mesh;

  scene.traverse(function(child) {
    if (child instanceof THREE.Mesh && child.name == name) {
      mesh = child;
      child.visible = true;
    }
  });
  return mesh;
};

TOW.invisibleSceneChildren = function(scene) {
  scene.traverse(function(child) {
    child.visible = false;
  });
};

TOW.visibleSceneChildren = function(scene) {
  scene.traverse(function(child) {
    child.visible = true;
  });
};

TOW.findMeshVisibleAndCenterRender = function(name, scene, onRender) {
  var mesh = TOW.findMeshAndVisibleMesh(name, scene);

  TOW.centerGeometryOffsetPivot(mesh, scene);
  TOW.render(function(t) { onRender(t, mesh); });
  return mesh;
};

TOW.clearOnRenders = function() {
  TOW._onRenders = [ ];
};

TOW.render = function(onRender) {
  if (TOW._render !== undefined) {
    if (onRender !== undefined) TOW._onRenders.push(onRender);

    return;
  }

  if (TOW.Canvas === undefined) document.body.appendChild(TOW.Renderer.domElement);

  TOW._onRenders = onRender !== undefined? [ onRender ]: [ ];
  TOW._render = function(t) {
    requestAnimationFrame(TOW._render);
    TOW._onRenders.forEach(function(r) { r(t); });
    TOW.Renderer.render(TOW.Scene, TOW.Camera);
  };

  TOW._render();
};

console.log('TOW.render: ' + TOW.REVISION);
