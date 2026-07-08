// Main Application Orchestrator

import { FeedManager } from './modules/feed.js';
import { MapManager } from './modules/map.js';
import { DispatchManager } from './modules/dispatch.js';
import { BridgeManager } from './modules/bridge.js';

class CrisisApp {
    constructor() {
        this.activeIncident = null;
        this.isEvacActive = false;
        this.evacRateInterval = null;
        
        // Response time calculations
        this.incidentStartTimes = {}; // key: incidentId, value: Date
        this.responseTimes = []; // array of numbers (seconds)
        
        this.initModules();
        this.initAppListeners();
        this.updateKPIs();
    }

    initModules() {
        // 1. Initialize Map
        this.mapManager = new MapManager();

        // 2. Initialize Communications Bridge
        this.bridgeManager = new BridgeManager(() => {
            // Callback when SOP checklist items are ticked
            console.log('SOP Checklist updated');
            this.updateKPIs();
        });

        // 3. Initialize Dispatcher
        this.dispatchManager = new DispatchManager(
            // On Dispatch callback
            (staffId, targetZone, onArrival) => {
                const incident = this.activeIncident;
                if (!incident) return;
                
                // Track response time (from creation to dispatch)
                const startTime = this.incidentStartTimes[incident.id];
                if (startTime) {
                    const elapsed = (new Date() - startTime) / 1000;
                    this.responseTimes.push(elapsed);
                    delete this.incidentStartTimes[incident.id];
                    this.updateKPIs();
                }

                // Log system message about deployment
                const staffMember = this.dispatchManager.responders.find(s => s.id === staffId);
                this.bridgeManager.chatLogs[incident.id].push({
                    sender: 'SYSTEM',
                    text: `[DISPATCHING] Ground responder ${staffMember.name} (${staffMember.role}) deployed to ${incident.zone}.`,
                    time: new Date()
                });
                this.bridgeManager.renderChat();

                // Animate dot on SVG Map
                this.mapManager.animateResponderDispatch(staffId, incident.zone, () => {
                    // Arrived on site
                    onArrival(); // Update dispatcher card status to On-Site
                    
                    // Log arrival in chat
                    this.bridgeManager.chatLogs[incident.id].push({
                        sender: 'SYSTEM',
                        text: `[ARRIVED] ${staffMember.name} is on-site in ${incident.zone}. Commencing assessment.`,
                        time: new Date()
                    });
                    this.bridgeManager.renderChat();
                });
            },
            // On Resolve callback
            (resolvedIncidentId) => {
                this.resolveIncident(resolvedIncidentId);
            }
        );

        // 4. Initialize Ingest & Simulation Feed
        this.feedManager = new FeedManager((newIncident) => {
            // Callback when a new incident is ingested
            this.handleNewIncident(newIncident);
        });

        // Start auto background alerts
        this.feedManager.startAutoSimulation();
    }

    initAppListeners() {
        // Scenario Trigger Buttons
        document.getElementById('sim-trigger-fire').addEventListener('click', () => this.feedManager.triggerIncident('fire'));
        document.getElementById('sim-trigger-medical').addEventListener('click', () => this.feedManager.triggerIncident('medical'));
        document.getElementById('sim-trigger-security').addEventListener('click', () => this.feedManager.triggerIncident('security'));
        document.getElementById('sim-trigger-pool').addEventListener('click', () => this.feedManager.triggerIncident('pool'));

        // Map Level Filters
        document.getElementById('btn-map-all').addEventListener('click', (e) => this.mapManager.changeView(e.target.id));
        document.getElementById('btn-map-f1').addEventListener('click', (e) => this.mapManager.changeView(e.target.id));
        document.getElementById('btn-map-f2').addEventListener('click', (e) => this.mapManager.changeView(e.target.id));
        document.getElementById('btn-map-f3').addEventListener('click', (e) => this.mapManager.changeView(e.target.id));

        // Evacuation Trigger Button
        const evacBtn = document.getElementById('evac-btn');
        evacBtn.addEventListener('click', () => this.toggleEvacuationMode());
    }

    handleNewIncident(incident) {
        // Record trigger start time for response tracking
        this.incidentStartTimes[incident.id] = new Date();

        // 1. Update Map Visuals
        this.mapManager.setZoneStatus(incident.zone, incident.severity);
        this.mapManager.setSensorStatus(incident.sensorId, incident.severity);

        // 2. Render Incident List item
        this.renderIncidentFeedItem(incident);

        // 3. Auto-select the incident if none is selected
        if (!this.activeIncident) {
            this.selectIncident(incident);
        }

        this.updateKPIs();
        this.updateHeaderSystemStatus();
    }

    selectIncident(incident) {
        this.activeIncident = incident;
        
        // Highlight active feed item card
        document.querySelectorAll('.feed-item').forEach(card => {
            card.classList.toggle('selected', card.getAttribute('data-id') === incident.id);
        });

        // Set state in bridge and dispatch sub-modules
        this.bridgeManager.setActiveIncident(incident);
        this.dispatchManager.setActiveIncident(incident ? incident.id : null);
    }

    resolveIncident(incidentId) {
        const incident = this.feedManager.resolveIncident(incidentId);
        if (!incident) return;

        // 1. Reset Map visuals
        this.mapManager.clearZoneStatus(incident.zone);
        this.mapManager.setSensorStatus(incident.sensorId, 'nominal');

        // 2. Update Feed item list styling
        const feedCard = document.querySelector(`.feed-item[data-id="${incidentId}"]`);
        if (feedCard) {
            feedCard.className = 'feed-item resolved';
            const badge = feedCard.querySelector('.badge');
            if (badge) {
                badge.className = 'badge success';
                badge.textContent = 'Resolved';
            }
        }

        // 3. Clear active states if current was resolved
        if (this.activeIncident && this.activeIncident.id === incidentId) {
            // Select next active incident if exists
            const nextActive = this.feedManager.incidents.find(inc => inc.status !== 'resolved');
            this.selectIncident(nextActive || null);
        }

        // Write terminal log notification
        if (this.bridgeManager.chatLogs[incidentId]) {
            this.bridgeManager.chatLogs[incidentId].push({
                sender: 'SYSTEM',
                text: '[INCIDENT CLOSED] Zone safe. Operations returning to nominal state.',
                time: new Date()
            });
            this.bridgeManager.renderChat();
        }

        this.updateKPIs();
        this.updateHeaderSystemStatus();
    }

    renderIncidentFeedItem(incident) {
        const listContainer = document.getElementById('feed-list-container');
        const placeholder = document.getElementById('feed-empty-placeholder');
        if (placeholder) placeholder.style.display = 'none';

        const card = document.createElement('div');
        card.className = `feed-item ${incident.severity}`;
        card.setAttribute('data-id', incident.id);

        const timeStr = incident.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const badgeClass = incident.severity === 'critical' ? 'badge critical' : 'badge warning';

        card.innerHTML = `
            <div class="feed-item-header">
                <span class="feed-item-source">${incident.source}</span>
                <span class="feed-item-time">${timeStr}</span>
            </div>
            <div class="feed-item-desc">${incident.desc}</div>
            <div class="feed-item-meta">
                <span class="feed-item-zone">${incident.zone.replace('zone-', '').replace('-', ' ').toUpperCase()}</span>
                <span class="${badgeClass}">${incident.severity}</span>
            </div>
        `;

        card.addEventListener('click', () => {
            this.selectIncident(incident);
        });

        // Insert at top of container (after placeholder if it was there)
        listContainer.insertBefore(card, listContainer.firstChild);
    }

    toggleEvacuationMode() {
        const evacBtn = document.getElementById('evac-btn');
        const banner = document.getElementById('evac-banner');

        if (this.isEvacActive) {
            // Turn off Evacuation
            this.isEvacActive = false;
            evacBtn.classList.remove('active');
            evacBtn.textContent = 'Initiate Evac';
            banner.classList.remove('active');

            // Reset Map zones colors
            this.feedManager.incidents.forEach(inc => {
                if (inc.status !== 'resolved') {
                    this.mapManager.setZoneStatus(inc.zone, inc.severity);
                } else {
                    this.mapManager.clearZoneStatus(inc.zone);
                }
            });

            // Stop simulated evacuation tracking
            clearInterval(this.evacRateInterval);
            document.getElementById('kpi-evacuated').textContent = '0%';
        } else {
            // Trigger Active Evacuation
            this.isEvacActive = true;
            evacBtn.classList.add('active');
            evacBtn.textContent = 'Cancel Evac';
            banner.classList.add('active');

            // Set all zones to flashing warning state
            document.querySelectorAll('.map-zone').forEach(zone => {
                zone.classList.remove('status-success');
                zone.classList.add('status-critical');
            });

            // Simulate evacuation rate counter (0% to 100% over 25 seconds)
            let evacRate = 0;
            document.getElementById('kpi-evacuated').textContent = '0%';
            
            this.evacRateInterval = setInterval(() => {
                evacRate += Math.floor(Math.random() * 8) + 4;
                if (evacRate >= 100) {
                    evacRate = 100;
                    clearInterval(this.evacRateInterval);
                }
                document.getElementById('kpi-evacuated').textContent = `${evacRate}%`;
            }, 1000);

            // Log general evac trigger to active channel
            if (this.activeIncident) {
                this.bridgeManager.chatLogs[this.activeIncident.id].push({
                    sender: 'SYSTEM',
                    text: '[EVACUATION TRIGGERED] General evacuation order broadcasted venue-wide. Siren loops active. Escape route visual guidances engaged.',
                    time: new Date()
                });
                this.bridgeManager.renderChat();
            }
        }
        
        this.updateHeaderSystemStatus();
    }

    updateKPIs() {
        const activeCount = this.feedManager.incidents.filter(inc => inc.status !== 'resolved').length;
        const resolvedCount = this.feedManager.incidents.filter(inc => inc.status === 'resolved').length;
        
        // Update Active Incidents KPI
        document.getElementById('kpi-active-incidents').textContent = activeCount;
        
        // Update Resolved Incidents KPI
        document.getElementById('kpi-resolved').textContent = resolvedCount;

        // Update Average Response Time KPI
        if (this.responseTimes.length > 0) {
            const sum = this.responseTimes.reduce((a, b) => a + b, 0);
            const avg = (sum / this.responseTimes.length).toFixed(1);
            document.getElementById('kpi-response-time').textContent = `${avg}s`;
        } else {
            document.getElementById('kpi-response-time').textContent = '0.0s';
        }
    }

    updateHeaderSystemStatus() {
        const activeCount = this.feedManager.incidents.filter(inc => inc.status !== 'resolved').length;
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');

        // Reset classes
        statusDot.className = 'dot';

        if (this.isEvacActive) {
            statusDot.classList.add('red');
            statusText.textContent = 'EVACUATION MODE';
            statusText.style.color = 'var(--color-danger)';
        } else if (activeCount > 0) {
            const hasCritical = this.feedManager.incidents.some(inc => inc.status !== 'resolved' && inc.severity === 'critical');
            if (hasCritical) {
                statusDot.classList.add('red');
                statusText.textContent = 'Crisis Level 1';
                statusText.style.color = 'var(--color-danger)';
            } else {
                statusDot.classList.add('orange');
                statusText.textContent = 'Alert Pending';
                statusText.style.color = 'var(--color-warning)';
            }
        } else {
            statusDot.classList.add('green');
            statusText.textContent = 'System Nominal';
            statusText.style.color = 'var(--color-success)';
        }
    }
}

// Instantiate App on load
window.addEventListener('DOMContentLoaded', () => {
    window.app = new CrisisApp();
});
