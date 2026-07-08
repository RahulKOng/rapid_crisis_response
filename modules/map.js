// Interactive Venue Map Control Module

export const ZONE_CENTERS = {
    'zone-parking': { x: 80, y: 200 },
    'zone-pool': { x: 485, y: 290 },
    'zone-lobby': { x: 215, y: 290 },
    'zone-restaurant': { x: 325, y: 290 },
    'zone-l1-rooms': { x: 270, y: 180 },
    'zone-l2-rooms': { x: 270, y: 115 },
    'zone-l3-suites': { x: 270, y: 60 }
};

// Route nodes for generating intelligent pathways through hallways/gates
const WAYPOINTS = {
    parking_gate: { x: 145, y: 260 },
    pool_gate: { x: 385, y: 260 },
    elevator_ground: { x: 270, y: 290 },
    elevator_l1: { x: 270, y: 180 },
    elevator_l2: { x: 270, y: 115 },
    elevator_l3: { x: 270, y: 60 }
};

export class MapManager {
    constructor() {
        this.zones = document.querySelectorAll('.map-zone');
        this.sensors = document.querySelectorAll('.sensor-marker');
        this.responders = {
            'r1': { element: document.getElementById('responder-r1'), pos: { x: 60, y: 160 }, type: 'security' },
            'r2': { element: document.getElementById('responder-r2'), pos: { x: 200, y: 260 }, type: 'medical' },
            'r3': { element: document.getElementById('responder-r3'), pos: { x: 300, y: 260 }, type: 'fire' }
        };
        this.routeLines = {
            'r1': document.getElementById('route-line-1'),
            'r2': document.getElementById('route-line-2'),
            'r3': document.createElementNS('http://www.w3.org/2000/svg', 'path') // dynamically create if needed
        };
        
        // Append third route line to SVG if it doesn't exist
        const svg = document.querySelector('.resort-map');
        this.routeLines['r3'].setAttribute('id', 'route-line-3');
        this.routeLines['r3'].setAttribute('class', 'dispatch-route-line');
        this.routeLines['r3'].setAttribute('stroke', 'var(--color-warning)');
        this.routeLines['r3'].style.display = 'none';
        svg.appendChild(this.routeLines['r3']);

        this.initEventListeners();
    }

    initEventListeners() {
        // Hover effects and clicks on zones can be monitored
        this.zones.forEach(zone => {
            zone.addEventListener('click', (e) => {
                const zoneId = zone.parentElement.id;
                console.log(`Zone clicked: ${zoneId}`);
            });
        });
    }

    setZoneStatus(zoneId, severity) {
        const zoneGroup = document.getElementById(zoneId);
        if (!zoneGroup) return;

        const zonePath = zoneGroup.querySelector('.map-zone');
        if (!zonePath) return;

        // Clear existing states
        zonePath.classList.remove('status-critical', 'status-warning', 'status-success');

        if (severity === 'critical') {
            zonePath.classList.add('status-critical');
        } else if (severity === 'warning') {
            zonePath.classList.add('status-warning');
        }
    }

    clearZoneStatus(zoneId) {
        const zoneGroup = document.getElementById(zoneId);
        if (!zoneGroup) return;

        const zonePath = zoneGroup.querySelector('.map-zone');
        if (!zonePath) return;

        zonePath.classList.remove('status-critical', 'status-warning');
    }

    setSensorStatus(sensorId, severity) {
        const sensorGroup = document.getElementById(sensorId);
        if (!sensorGroup) return;

        const marker = sensorGroup.querySelector('.sensor-marker');
        if (!marker) return;

        marker.classList.remove('active', 'alert', 'critical');
        if (severity === 'critical') {
            marker.classList.add('critical');
        } else if (severity === 'warning') {
            marker.classList.add('alert');
        } else {
            marker.classList.add('active');
        }
    }

    // Pathfinding algorithm that returns SVG path strings
    calculateRoute(start, endZone) {
        const end = ZONE_CENTERS[endZone];
        if (!end) return `M ${start.x} ${start.y} L ${start.x} ${start.y}`;

        const points = [start];

        // Is starting point in the parking lot?
        const isStartParking = start.x < 145;
        // Is starting point in the pool?
        const isStartPool = start.x > 385;
        // Is end point in parking lot?
        const isEndParking = endZone === 'zone-parking';
        // Is end point in pool?
        const isEndPool = endZone === 'zone-pool';

        let currentX = start.x;
        let currentY = start.y;

        // Route out of parking if starting there
        if (isStartParking && !isEndParking) {
            points.push(WAYPOINTS.parking_gate);
            currentX = WAYPOINTS.parking_gate.x;
            currentY = WAYPOINTS.parking_gate.y;
        }

        // Route out of pool if starting there
        if (isStartPool && !isEndPool) {
            points.push(WAYPOINTS.pool_gate);
            currentX = WAYPOINTS.pool_gate.x;
            currentY = WAYPOINTS.pool_gate.y;
        }

        // Inside building transitions
        if (!isEndParking && !isEndPool) {
            // Need elevator access?
            const endLevel = endZone.includes('l1') ? 'l1' : endZone.includes('l2') ? 'l2' : endZone.includes('l3') ? 'l3' : 'ground';
            
            if (endLevel !== 'ground') {
                // Route to ground elevator first
                points.push({ x: WAYPOINTS.elevator_ground.x, y: currentY });
                
                // Go up elevator shaft
                if (endLevel === 'l1') points.push(WAYPOINTS.elevator_l1);
                if (endLevel === 'l2') points.push(WAYPOINTS.elevator_l2);
                if (endLevel === 'l3') points.push(WAYPOINTS.elevator_l3);
            }
        } else {
            // Routing to outside zones
            if (isEndParking && !isStartParking) {
                points.push(WAYPOINTS.parking_gate);
            }
            if (isEndPool && !isStartPool) {
                points.push(WAYPOINTS.pool_gate);
            }
        }

        // Finally go to destination center
        points.push(end);

        // Map points to SVG Path string
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }

    animateResponderDispatch(responderId, targetZone, onArrivalCallback) {
        const responder = this.responders[responderId];
        const routeLine = this.routeLines[responderId];
        if (!responder || !routeLine) return;

        const pathData = this.calculateRoute(responder.pos, targetZone);
        
        // Show path line
        routeLine.setAttribute('d', pathData);
        routeLine.style.display = 'block';

        responder.element.classList.add('deploying');

        // To animate along the calculated multi-point path, we calculate total path length
        // and transition coordinates step-by-step, or jump directly.
        // For standard UI experience, let's update the coordinates step-by-step
        // or interpolate over 3 seconds.
        const pathPoints = pathData.split(' ').filter(v => !isNaN(parseFloat(v)));
        const coords = [];
        for (let i = 0; i < pathPoints.length; i += 2) {
            coords.push({ x: parseFloat(pathPoints[i]), y: parseFloat(pathPoints[i+1]) });
        }

        let currentStep = 0;
        const totalSteps = coords.length;
        const stepDuration = 2500 / totalSteps; // Total deployment duration ~2.5s

        const moveStep = () => {
            if (currentStep < totalSteps) {
                const nextPos = coords[currentStep];
                responder.element.setAttribute('transform', `translate(${nextPos.x}, ${nextPos.y})`);
                responder.pos = nextPos;
                currentStep++;
                setTimeout(moveStep, stepDuration);
            } else {
                // Arrived
                responder.element.classList.remove('deploying');
                routeLine.style.display = 'none';
                if (onArrivalCallback) {
                    onArrivalCallback();
                }
            }
        };

        moveStep();
    }

    changeView(viewId) {
        // Toggle view configurations for focus levels
        const views = {
            'btn-map-all': { opacity: { 'zone-parking': 1, 'zone-pool': 1, 'zone-lobby': 1, 'zone-restaurant': 1, 'zone-l1-rooms': 1, 'zone-l2-rooms': 1, 'zone-l3-suites': 1 } },
            'btn-map-f1': { opacity: { 'zone-parking': 1, 'zone-pool': 1, 'zone-lobby': 1, 'zone-restaurant': 1, 'zone-l1-rooms': 0.1, 'zone-l2-rooms': 0.1, 'zone-l3-suites': 0.1 } },
            'btn-map-f2': { opacity: { 'zone-parking': 0.1, 'zone-pool': 0.1, 'zone-lobby': 0.1, 'zone-restaurant': 0.1, 'zone-l1-rooms': 0.1, 'zone-l2-rooms': 1, 'zone-l3-suites': 0.1 } },
            'btn-map-f3': { opacity: { 'zone-parking': 0.1, 'zone-pool': 0.1, 'zone-lobby': 0.1, 'zone-restaurant': 0.1, 'zone-l1-rooms': 0.1, 'zone-l2-rooms': 0.1, 'zone-l3-suites': 1 } }
        };

        const config = views[viewId];
        if (!config) return;

        Object.keys(config.opacity).forEach(zoneId => {
            const group = document.getElementById(zoneId);
            if (group) {
                group.style.opacity = config.opacity[zoneId];
            }
        });

        // Toggle buttons
        document.querySelectorAll('.map-btn').forEach(btn => {
            if (btn.id === viewId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}
