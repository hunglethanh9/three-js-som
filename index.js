const THREE = require('three')
const OrbitControls = require('three-orbit-controls')(THREE)
const dat = require('dat.gui');

params = {
    neuronsInitialRadius: 5,
    neuronsAmountSide: 100,
}

var neuronsCount, iteration = 0;

initThree();
initNeurons();
initTarget = (size) => initSphere(size / 2.0);
initTarget(10);
animate();

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

function animate() {
    requestAnimationFrame(animate);

    var pickedTarget = sampleSphere(5);
    iterate(pickedTarget, iteration);
    iteration++;

    neuronsBufferGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}

function initNeurons() {
    neuronsCount = params.neuronsAmountSide;

    var points = [];
    for (var i = 0; i < neuronsCount; i++) {
        var point = sampleSphere(params.neuronsInitialRadius);
        points.push(point.x, point.y, point.z);
    }

    neuronsBufferGeometry = new THREE.BufferGeometry();
    neuronsBufferGeometry.dynamic = true;
    var vertices = new Float32Array(points);
    neuronsBufferGeometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    neuronPositions = neuronsBufferGeometry.attributes.position.array;

    var neuronsMaterial = new THREE.PointsMaterial({ size: .2 });
    var neuronPoints = new THREE.Points(neuronsBufferGeometry, neuronsMaterial);
    scene.add(neuronPoints);

    var neuronLinesMaterial = new THREE.LineDashedMaterial()
    var neuronLines = new THREE.Line(neuronsBufferGeometry, neuronLinesMaterial);
    scene.add(neuronLines);
}

window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function initSphere(radius) {
    var geometry = new THREE.IcosahedronBufferGeometry(radius, 2);
    var wireframe = new THREE.WireframeGeometry(geometry);
    var material = new THREE.LineBasicMaterial({ color: 0x000000 });
    var lines = new THREE.LineSegments(wireframe, material);
    scene.add(lines);
}

// http://mathworld.wolfram.com/SpherePointPicking.html
function sampleSphere(radius) {
    var u = Math.random();
    var v = Math.random();
    var theta = 2 * Math.PI * u;
    var phi = Math.acos(2 * v - 1);
    var sinPhi = Math.sin(phi);
    var adjustedRandomRadius = radius * Math.cbrt(Math.random());
    var x = adjustedRandomRadius * Math.cos(theta) * sinPhi;
    var y = adjustedRandomRadius * Math.sin(theta) * sinPhi
    var z = adjustedRandomRadius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

function findClosestNeuron(point) {
    var minIndex, minDistance = Infinity, minPosition;
    for (var i = 0; i < neuronsCount; i++) {
        var position = getNeuronPosition(i);
        var distance = position.distanceTo(point);
        if (distance < minDistance) {
            minDistance = distance;
            minIndex = i;
            minPosition = position;
        }
    }
    return [minIndex, minPosition];
}

/*
function getNeighborIndices1D(center, radius) {
    var integerRadius = Math.floor(radius);
    var start = Math.max(center - integerRadius, 0);
    var end = Math.min(center + integerRadius, neuronsCount);
    return _.range(start, end);
}

var getNeighborIndices = (center, radius) => getNeighborIndices(center, radius);
*/

function neighborhoodDistance1D(a, b) {
    return Math.abs(a - b);
}

neighborhoodDistance = (a, b) => neighborhoodDistance1D(a, b);

function gaussian(x, sigma) {
    return Math.exp(-(x * x) / (sigma * sigma));
}

function iterate(targetPosition, iteration) {
    var decayingCoefficient = Math.exp(-iteration / 50);
    var range = neuronsCount * decayingCoefficient;
    var force = decayingCoefficient;

    var bestIndex, bestPosition;
    [bestIndex, bestPosition] = findClosestNeuron(targetPosition);

    for (var i = 0; i < neuronsCount; i++)
    {
        var position = getNeuronPosition(i);
        var indexDistance = neighborhoodDistance1D(i, bestIndex);
        var g = gaussian(indexDistance, range);
        position = position.addScaledVector(targetPosition.sub(position), force * g);
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