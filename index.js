const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const dat = require('dat.gui');

var params = {
    rotationX: .01,
    rotationY: .01
}

const TAU = 2 * Math.PI;

start();
render();

function start() {
    scene = new THREE.Scene();

    aspect = window.innerWidth / window.innerHeight;
    fov = 60;
    camera = new THREE.PerspectiveCamera(fov, aspect);
    camera.position.set(1, 1, 1);
    camera.lookAt(new THREE.Vector3());

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    var geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    var material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    box = new THREE.LineSegments(geometry, material);
    scene.add(box);

    var axesHelper = new THREE.AxesHelper();
    scene.add(axesHelper);

    gui = new dat.GUI();
    gui.add(params, 'rotationX', .0, .1);
    gui.add(params, 'rotationY', .0, .1);
}

function render() {
    requestAnimationFrame(render);
    box.rotation.x += params.rotationX;
    box.rotation.y += params.rotationY;
    renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}