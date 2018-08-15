var THREE = require('three')
var OrbitControls = require('three-orbit-controls')(THREE)

start();
render();

function start() {
    scene = new THREE.Scene();

    aspect = window.innerWidth / window.innerHeight;
    fov = 60;
    camera = new THREE.PerspectiveCamera(fov, aspect);
    camera.position.set(0, 0, 2);
    camera.lookAt(new THREE.Vector3());

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera);

    var geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    var material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    box = new THREE.LineSegments(geometry, material);
    scene.add(box);
}

function render() {
    requestAnimationFrame(render);
    box.rotation.x += .01;
    box.rotation.y += .01;
    renderer.render(scene, camera);
}

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}