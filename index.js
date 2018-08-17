const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const dat = require('dat.gui');

guiParams = {
    networkParams: {
        neuronsSpread: 1,
        neuronsCount: 200,
        initialRange: 0.3,
        initialForce: 0.3,
        rangeDecay: 0.0007,
        forceDecay: 0.0005,
    },
    iteration: 0,
    map: '1D',
    dataset: '3D sphere volume',
    isPlaying: true,
    restart: () => restartScene(),
    iterate: () => iterate(),
    info: () => document.getElementById('modal').style.display = 'block',
}

let neuronsCount, neuronsCountSide, iteration = 0;

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

    gui.add(guiParams, 'info').name('<b>What is going on?</b>');

    gui.add(guiParams, 'dataset', ['3D sphere volume']).name('Dataset (map from...)');
    gui.add(guiParams, 'map', ['1D', '2D', '3D']).name('Network (map to...)');

    let paramsFolder = gui.addFolder('Network parameters');
    paramsFolder
        .add(guiParams.networkParams, 'neuronsCount', 10, 10000)
        .name('neuron count <a href="#" title="For a multidimensional network, this will be clamped down to fit a regular grid">?</a>');
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
        .name('<b>&lambda;<sub>&sigma;</sub></b> force decay');

    gui.add(guiParams, 'isPlaying').name('Autoplay');
    gui.add(guiParams, 'iterate').name('Step forward');
    gui.add(guiParams, 'iteration').name('Iteration').listen();
    gui.add(guiParams, 'restart').name('<b>RESTART</b>');
}

function initScene() {
    console.dir(guiParams);
    params = Object.assign({}, guiParams.networkParams);
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
    guiParams.iteration = iteration;
}

function animate() {
    requestAnimationFrame(animate);

    if (guiParams.isPlaying) {
        iterate();
    }

    renderer.render(scene, camera);
}

function initNeurons() {
    switch (guiParams.map) {
        case '1D':
            networkDimensions = 1;
            break;
        case '2D':
            networkDimensions = 2;
            break;
            case '3D':
            networkDimensions = 3;
            break;
    }

    neuronsCountSide = Math.floor(Math.pow(params.neuronsCount, 1 / networkDimensions));
    neuronsCount = Math.pow(neuronsCountSide, networkDimensions);

    let points = [];
    for (let i = 0; i < neuronsCount; i++) {
        let point = sampleFromSphereVolume(params.neuronsSpread);
        points.push(point.x, point.y, point.z);
    }

    neuronsBufferGeometry = new THREE.BufferGeometry();
    neuronsBufferGeometry.dynamic = true;
    let vertices = new Float32Array(points);
    neuronsBufferGeometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    neuronPositions = neuronsBufferGeometry.attributes.position.array;

    let neuronsMaterial = new THREE.PointsMaterial({ size: .05 });
    neuronPoints = new THREE.Points(neuronsBufferGeometry, neuronsMaterial);
    scene.add(neuronPoints);

    let neuronLinesMaterial = new THREE.LineBasicMaterial()
    neuronLines = new THREE.Line(neuronsBufferGeometry, neuronLinesMaterial);

    switch (guiParams.map) {
        case '1D':
            neighborhoodDistance = (a, b) => neighborhoodDistance1D(a, b);
            scene.add(neuronLines);
            break;
        case '2D':
            neighborhoodDistance = (a, b) => neighborhoodDistance2D(a, b);
            scene.add(neuronLines);
            break;
            case '3D':
            neighborhoodDistance = (a, b) => neighborhoodDistance3D(a, b);
            scene.add(neuronLines);
            break;
    }
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

function neighborhoodDistance2D(index1, index2) {
    let x1 = index1 % neuronsCountSide;
    let y1 = Math.floor(index1 / neuronsCountSide);
    let x2 = index2 % neuronsCountSide;
    let y2 = Math.floor(index2 / neuronsCountSide);
    return new THREE.Vector2(x1 - x2, y1 - y2).length();
}

function neighborhoodDistance3D(index1, index2) {
    let x1 = index1 % neuronsCountSide;
    let y1 = Math.floor(index1 / neuronsCountSide) % neuronsCountSide;
    let z1 = Math.floor(index1 / (neuronsCountSide * neuronsCountSide));
    let x2 = index2 % neuronsCountSide;
    let y2 = Math.floor(index2 / neuronsCountSide) % neuronsCountSide;
    let z2 = Math.floor(index2 / (neuronsCountSide * neuronsCountSide));
    return new THREE.Vector3(x1 - x2, y1 - y2, z1 - z2).length();
}

function gaussian(x, sigma) {
    return Math.exp(-(x * x) / (sigma * sigma));
}

function iterate() {
    let targetPosition = sampleFromData();
    let range = params.initialRange * neuronsCountSide * networkDimensions * Math.exp(-params.rangeDecay * iteration);
    let force = params.initialForce * Math.exp(-params.forceDecay * iteration);

    let bestIndex, bestPosition;
    [bestIndex, bestPosition] = findClosestNeuron(targetPosition);

    for (let i = 0; i < neuronsCount; i++) {
        let position = getNeuronPosition(i);
        let indexDistance = neighborhoodDistance(i, bestIndex);
        let scale = force * gaussian(indexDistance, range);
        let difference = new THREE.Vector3().subVectors(targetPosition, position);
        position.addScaledVector(difference, scale);
        setNeuronPosition(i, position);
    }

    iteration++;
    guiParams.iteration = iteration;

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

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}