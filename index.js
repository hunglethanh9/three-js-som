const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const dat = require('dat.gui');

guiParams = {
    networkParams: {
        neuronsSpread: 1,
        neuronsCount: 1000,
        initialRange: 0.5,
        initialForce: 0.5,
        rangeDecay: 0.001,
        forceDecay: 0.0006,
    },
    isPlaying: true,
    restart: () => restartScene(),
    iterate: () => iterate(),
}

let neuronsCount, iteration = 0;

initThree();
initTarget = (size) => initSphere(size / 2.0);
initScene();
animate();

function initThree() {
    scene = new THREE.Scene();
    let backgroundColor = new THREE.Color(0x888888);
    scene.fog = new THREE.FogExp2(backgroundColor, 0.06);
    scene.background = backgroundColor;

    aspect = window.innerWidth / window.innerHeight;
    let fov = 60;
    camera = new THREE.PerspectiveCamera(fov, aspect);
    let distance = 7;
    camera.position.set(distance, distance, distance);
    camera.lookAt(new THREE.Vector3());

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;

    let gui = new dat.GUI({ width: 300 });

    let paramsFolder = gui.addFolder('Network parameters');
    paramsFolder
        .add(guiParams.networkParams, 'neuronsCount', 10, 10000)
        .name('neuron count <a style="color: #fff" href="" title="For a multidimensional network, this will be clamped down to fit a regular grid">?</a>');
    paramsFolder
        .add(guiParams.networkParams, 'initialRange', 0, 1)
        .name('<b>h</b> initial range');
    paramsFolder
        .add(guiParams.networkParams, 'rangeDecay', 0, .005)
        .name('<b>&lambda;<sub>h</sub></b> range decay');
    paramsFolder
        .add(guiParams.networkParams, 'initialForce', 0, 1)
        .name('<b>&sigma;</b> initial force');
    paramsFolder
        .add(guiParams.networkParams, 'forceDecay', 0, .005)
        .name('<b>&lambda;<sub>&sigma;</sub></b> force decay');;

    gui.add(guiParams, 'isPlaying').name('Autoplay');
    gui.add(guiParams, 'iterate').name('Iterate once');
    gui.add(guiParams, 'restart').name('<b>RESTART</b>');
}

function initScene() {
    params = Object.assign({}, guiParams.networkParams);
    console.table(params);
    initNeurons();
    initTarget(10);
}

function clearScene() {
    scene.remove(neuronPoints);
    scene.remove(neuronLines);
    neuronsBufferGeometry.dispose();
    scene.remove(dataRepresentation);
}

function restartScene() {
    clearScene();
    initScene();
    iteration = 0;
}

function animate() {
    requestAnimationFrame(animate);

    if (guiParams.isPlaying) {
        iterate();
    }

    renderer.render(scene, camera);
}

function initNeurons() {
    neuronsCount = params.neuronsCount;

    let points = [];
    for (let i = 0; i < neuronsCount; i++) {
        let point = sampleFromSphereVolume(params.neuronsSpread);
        points.push(point.x, point.y, point.z);
    }

    neuronsBufferGeometry = new THREE.BufferGeometry();
    neuronsBufferGeometry.dynamic = true;
    let vertices = new Float32Array(points);
    neuronsBufferGeometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    neuronsBufferGeometry.computeBoundingSphere();
    neuronPositions = neuronsBufferGeometry.attributes.position.array;

    let neuronsMaterial = new THREE.PointsMaterial({ size: .1 });
    neuronPoints = new THREE.Points(neuronsBufferGeometry, neuronsMaterial);
    scene.add(neuronPoints);

    let neuronLinesMaterial = new THREE.LineBasicMaterial()
    neuronLines = new THREE.Line(neuronsBufferGeometry, neuronLinesMaterial);
    scene.add(neuronLines);
}

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function initSphere(radius) {
    let geometry = new THREE.IcosahedronBufferGeometry(radius, 2);
    let wireframe = new THREE.WireframeGeometry(geometry);
    let material = new THREE.LineBasicMaterial({ color: 0x000000 });
    dataRepresentation = new THREE.LineSegments(wireframe, material);
    scene.add(dataRepresentation);
    sampleFromData = () => sampleFromSphereVolume(5);
}

function sampleFromSphereVolume(radius) {
    let u = Math.random();
    let v = Math.random();
    let theta = 2 * Math.PI * u;
    let phi = Math.acos(2 * v - 1);
    let sinPhi = Math.sin(phi);
    let adjustedRandomRadius = radius * Math.cbrt(Math.random());
    let x = adjustedRandomRadius * Math.cos(theta) * sinPhi;
    let y = adjustedRandomRadius * Math.sin(theta) * sinPhi
    let z = adjustedRandomRadius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

function findClosestNeuron(point) {
    let minIndex, minDistance = Infinity, minPosition;
    for (let i = 0; i < neuronsCount; i++) {
        let position = getNeuronPosition(i);
        let distance = position.distanceTo(point);
        if (distance < minDistance) {
            minDistance = distance;
            minIndex = i;
            minPosition = position;
        }
    }
    return [minIndex, minPosition];
}

function neighborhoodDistance1D(index1, index2) {
    return Math.abs(index1 - index2);
}

neighborhoodDistance = (a, b) => neighborhoodDistance1D(a, b);

function gaussian(x, sigma) {
    return Math.exp(-(x * x) / (sigma * sigma));
}

function iterate() {
    let targetPosition = sampleFromData();
    let range = params.initialRange * neuronsCount * Math.exp(-params.rangeDecay * iteration);
    let force = params.initialForce * Math.exp(-params.forceDecay * iteration);

    let bestIndex, bestPosition;
    [bestIndex, bestPosition] = findClosestNeuron(targetPosition);

    for (let i = 0; i < neuronsCount; i++) {
        let position = getNeuronPosition(i);
        let indexDistance = neighborhoodDistance1D(i, bestIndex);
        let scale = force * gaussian(indexDistance, range);
        let difference = new THREE.Vector3().subVectors(targetPosition, position);
        position.addScaledVector(difference, scale);
        setNeuronPosition(i, position);
    }

    iteration++;

    neuronsBufferGeometry.attributes.position.needsUpdate = true;
}

function getNeuronPosition(index) {
    return new THREE.Vector3(
        neuronPositions[3 * index + 0],
        neuronPositions[3 * index + 1],
        neuronPositions[3 * index + 2]
    );
}

function setNeuronPosition(index, position) {
    neuronPositions[3 * index + 0] = position.x;
    neuronPositions[3 * index + 1] = position.y;
    neuronPositions[3 * index + 2] = position.z;
}