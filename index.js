const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const dat = require('dat.gui');

params = {
    neuronsInitialSpread: 3,
    neuronsAmount: 100,
}

initThree();
initNeurons();
initTarget = () => initSphere();
initTarget();
render();

function initThree() {
    scene = new THREE.Scene();
    var backgroundColor = new THREE.Color(0x888888);
    scene.fog = new THREE.FogExp2(backgroundColor, 0.06);
    scene.background = backgroundColor;

    aspect = window.innerWidth / window.innerHeight;
    var fov = 60;
    camera = new THREE.PerspectiveCamera(fov, aspect);
    var distance = 7;
    camera.position.set(distance, distance, distance);
    camera.lookAt(new THREE.Vector3());

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    /*
    gui = new dat.GUI();
    gui.add(params, 'neuronsInitialSpread', 0, 10);
    gui.add(params, 'neuronsAmount', 10, 1000).step(100);
    */
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

function initNeurons() {
    var neuronCoords = [];
    for (var i = 0; i < params.neuronsAmount; i++) {
        neuronCoords.push(
            params.neuronsInitialSpread * (.5 - Math.random()),
            params.neuronsInitialSpread * (.5 - Math.random()),
            params.neuronsInitialSpread * (.5 - Math.random())
        );
    }
    var geometry = new THREE.BufferGeometry();
    var vertices = new Float32Array(neuronCoords);
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));

    var neuronsMaterial = new THREE.PointsMaterial({ size: .2 });
    var neurons = new THREE.Points(geometry, neuronsMaterial);
    scene.add(neurons);

    var neuronLinesMaterial = new THREE.LineDashedMaterial()
    var neuronLines = new THREE.Line(geometry, neuronLinesMaterial);
    scene.add(neuronLines);
}

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function initSphere() {
    var radius = 5;
    var geometry = new THREE.IcosahedronBufferGeometry(radius, 2);
    var wireframe = new THREE.WireframeGeometry(geometry);
    var material = new THREE.LineBasicMaterial({ color: 0x000000 });
    var lines = new THREE.LineSegments(wireframe, material);
    scene.add(lines);
}