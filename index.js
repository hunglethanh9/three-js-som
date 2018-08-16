const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const dat = require('dat.gui');

params = {
    neuronsInitialRadius: 1,
    neuronsAmountSide: 1000,
    isPlaying: true,
    initialRange: 0.5,
    initialForce: 0.5,
    rangeDecay: 0.001,
    forceDecay: 0.0006,
}

let neuronsCount, iteration = 0;

initThree();
initNeurons();
initTarget = (size) => initSphere(size / 2.0);
initTarget(10);
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
}

function animate() {
    requestAnimationFrame(animate);

    if (params.isPlaying) {
        let pickedTarget = randomFromSphere(5);

        iterate(pickedTarget, iteration);
        iteration++;
        neuronsBufferGeometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
}

function initNeurons() {
    neuronsCount = params.neuronsAmountSide;

    let points = [];
    for (let i = 0; i < neuronsCount; i++) {
        let point = randomFromSphere(params.neuronsInitialRadius);
        points.push(point.x, point.y, point.z);
    }

    neuronsBufferGeometry = new THREE.BufferGeometry();
    neuronsBufferGeometry.dynamic = true;
    let vertices = new Float32Array(points);
    neuronsBufferGeometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    neuronsBufferGeometry.computeBoundingSphere();
    neuronPositions = neuronsBufferGeometry.attributes.position.array;

    let neuronsMaterial = new THREE.PointsMaterial({ size: .1 });
    let neuronPoints = new THREE.Points(neuronsBufferGeometry, neuronsMaterial);
    scene.add(neuronPoints);

    let neuronLinesMaterial = new THREE.LineBasicMaterial()
    let neuronLines = new THREE.Line(neuronsBufferGeometry, neuronLinesMaterial);
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
    let lines = new THREE.LineSegments(wireframe, material);
    scene.add(lines);
}

function randomFromSphere(radius) {
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

function iterate(targetPosition, iteration) {
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