// Distress Feed and Sensor Ingestion Simulation Module

export const INCIDENT_TYPES = {
    FIRE: 'FIRE',
    MEDICAL: 'MEDICAL',
    SECURITY: 'SECURITY',
    ENVIRONMENTAL: 'ENVIRONMENTAL'
};

export const SEVERITY_LEVELS = {
    CRITICAL: 'critical',
    WARNING: 'warning',
    ADVISORY: 'advisory'
};

export const SOP_DATABASE = {
    [INCIDENT_TYPES.FIRE]: [
        { id: 'f1', text: 'Confirm alarm sector location & trigger local building alarms.', done: false },
        { id: 'f2', text: 'Instruct HVAC to shut off air flow to contain smoke.', done: false },
        { id: 'f3', text: 'Dispatch Fire Marshal to guide evacuations & check escape routes.', done: false },
        { id: 'f4', text: 'Bridge communications to municipal fire response agency.', done: false },
        { id: 'f5', text: 'Clear fire lanes in parking area for responder vehicles.', done: false }
    ],
    [INCIDENT_TYPES.MEDICAL]: [
        { id: 'm1', text: 'Deploy nearest EMT-certified responder with trauma/AED kit.', done: false },
        { id: 'm2', text: 'Obtain precise room/room location details and access codes.', done: false },
        { id: 'm3', text: 'Coordinate with main entrance to escort paramedics.', done: false },
        { id: 'm4', text: 'Establish two-way comms channel with guest/witness.', done: false }
    ],
    [INCIDENT_TYPES.SECURITY]: [
        { id: 's1', text: 'Deploy double officer security dispatch to the sector.', done: false },
        { id: 's2', text: 'Isolate CCTV cameras of the zone to console monitor 1.', done: false },
        { id: 's3', text: 'Instruct on-site staff to retreat to secure employee backrooms.', done: false },
        { id: 's4', text: 'Prepare response log for police report compilation.', done: false }
    ],
    [INCIDENT_TYPES.ENVIRONMENTAL]: [
        { id: 'e1', text: 'Isolate main water/gas shutoff valve for target area.', done: false },
        { id: 'e2', text: 'Warn guests in surrounding zones of temporary closure.', done: false },
        { id: 'e3', text: 'Deploy maintenance engineer to inspect & repair nodes.', done: false }
    ]
};

// Preset alert scenarios for simulation triggers
export const INCIDENT_TEMPLATES = {
    fire: {
        type: INCIDENT_TYPES.FIRE,
        source: 'Kitchen Smoke Sensor (#KS-04)',
        desc: 'Extreme temperature reading (185°F) & smoke concentration exceeding 400ppm.',
        zone: 'zone-restaurant',
        sensorId: 'sensor-kitchen-smoke',
        severity: SEVERITY_LEVELS.CRITICAL,
        sop: SOP_DATABASE[INCIDENT_TYPES.FIRE]
    },
    medical: {
        type: INCIDENT_TYPES.MEDICAL,
        source: 'Suite 302 Panic Button (#PB-302)',
        desc: 'Panic button pressed. Guest reporting chest pains and breathing difficulty.',
        zone: 'zone-l3-suites',
        sensorId: 'sensor-l3-panic',
        severity: SEVERITY_LEVELS.CRITICAL,
        sop: SOP_DATABASE[INCIDENT_TYPES.MEDICAL]
    },
    security: {
        type: INCIDENT_TYPES.SECURITY,
        source: 'Lobby Security Intercom (#LI-01)',
        desc: 'Front desk reports verbal altercation. Suspicious individual refusing to leave lobby.',
        zone: 'zone-lobby',
        sensorId: 'sensor-parking-motion', // default fallbacks for visual markers
        severity: SEVERITY_LEVELS.WARNING,
        sop: SOP_DATABASE[INCIDENT_TYPES.SECURITY]
    },
    pool: {
        type: INCIDENT_TYPES.ENVIRONMENTAL,
        source: 'Pool Safety System (#PS-10)',
        desc: 'Water level sensor anomaly / splash detection alert. Slip incident reported near deep end.',
        zone: 'zone-pool',
        sensorId: 'sensor-pool-water',
        severity: SEVERITY_LEVELS.WARNING,
        sop: SOP_DATABASE[INCIDENT_TYPES.ENVIRONMENTAL]
    }
};

export class FeedManager {
    constructor(onAlertAddedCallback) {
        this.incidents = [];
        this.onAlertAdded = onAlertAddedCallback;
        this.autoSimTimer = null;
    }

    triggerIncident(templateKey) {
        const template = INCIDENT_TEMPLATES[templateKey];
        if (!template) return null;

        // Check if an active incident in this zone already exists
        const exists = this.incidents.find(inc => inc.zone === template.zone && inc.status !== 'resolved');
        if (exists) return exists;

        const newIncident = {
            id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
            type: template.type,
            source: template.source,
            desc: template.desc,
            zone: template.zone,
            sensorId: template.sensorId,
            severity: template.severity,
            timestamp: new Date(),
            status: 'unresolved',
            assignedStaff: null,
            sop: JSON.parse(JSON.stringify(template.sop)) // deep copy SOP checklist
        };

        this.incidents.unshift(newIncident);
        
        if (this.onAlertAdded) {
            this.onAlertAdded(newIncident);
        }

        return newIncident;
    }

    resolveIncident(incidentId) {
        const incident = this.incidents.find(inc => inc.id === incidentId);
        if (incident) {
            incident.status = 'resolved';
            return incident;
        }
        return null;
    }

    startAutoSimulation() {
        // Automatically inject random events over time to make the console feel alive
        const randomEvents = ['security', 'pool'];
        this.autoSimTimer = setInterval(() => {
            if (Math.random() > 0.6) {
                const randomKey = randomEvents[Math.floor(Math.random() * randomEvents.length)];
                this.triggerIncident(randomKey);
            }
        }, 15000);
    }

    stopAutoSimulation() {
        if (this.autoSimTimer) {
            clearInterval(this.autoSimTimer);
        }
    }
}
