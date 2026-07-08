// Ground Staff Dispatch Engine

export const RESPONDERS_DATA = [
    {
        id: 'r1',
        name: 'Officer John',
        role: 'On-Site Security Guard',
        skills: ['De-escalation', 'First Aid', 'Tactical Guard'],
        status: 'Idle', // Idle, Dispatching, On-Site
        targetIncident: null,
        iconClass: 'security'
    },
    {
        id: 'r2',
        name: 'Nurse Sarah',
        role: 'Paramedic & EMT Specialist',
        skills: ['CPR Certified', 'Trauma Care', 'Triage'],
        status: 'Idle',
        targetIncident: null,
        iconClass: 'medical'
    },
    {
        id: 'r3',
        name: 'Marshal Marcus',
        role: 'Fire & Safety Lead',
        skills: ['Hazard Isolation', 'Evacuation Control', 'Extinguishing'],
        status: 'Idle',
        targetIncident: null,
        iconClass: 'fire'
    }
];

export class DispatchManager {
    constructor(onDispatchCallback, onResolveCallback) {
        this.responders = JSON.parse(JSON.stringify(RESPONDERS_DATA));
        this.onDispatch = onDispatchCallback;
        this.onResolve = onResolveCallback;
        this.activeIncidentId = null;
        this.container = document.getElementById('staff-roster-container');
    }

    setActiveIncident(incidentId) {
        this.activeIncidentId = incidentId;
        this.render();
    }

    dispatchStaff(staffId, incidentId, zone) {
        const staff = this.responders.find(s => s.id === staffId);
        if (!staff || staff.status !== 'Idle') return;

        staff.status = 'Dispatching';
        staff.targetIncident = incidentId;
        this.render();

        if (this.onDispatch) {
            this.onDispatch(staffId, zone, () => {
                // Arrival Callback
                staff.status = 'On-Site';
                this.render();
            });
        }
    }

    resolveStaff(staffId) {
        const staff = this.responders.find(s => s.id === staffId);
        if (!staff || staff.status !== 'On-Site') return;

        const resolvedIncidentId = staff.targetIncident;
        staff.status = 'Idle';
        staff.targetIncident = null;
        this.render();

        if (this.onResolve) {
            this.onResolve(resolvedIncidentId);
        }
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        this.responders.forEach(staff => {
            const card = document.createElement('div');
            card.className = `staff-card ${staff.status === 'On-Site' ? 'selected' : ''}`;
            
            let statusDotColor = 'green';
            if (staff.status === 'Dispatching') statusDotColor = 'orange';
            if (staff.status === 'On-Site') statusDotColor = 'red';

            const skillsHtml = staff.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');
            
            let actionBtnHtml = '';
            if (staff.status === 'Idle') {
                const disabled = !this.activeIncidentId ? 'disabled' : '';
                actionBtnHtml = `<button class="staff-btn primary" ${disabled} data-id="${staff.id}" data-action="dispatch">Dispatch</button>`;
            } else if (staff.status === 'Dispatching') {
                actionBtnHtml = `<button class="staff-btn secondary" disabled>Deploying...</button>`;
            } else if (staff.status === 'On-Site') {
                actionBtnHtml = `<button class="staff-btn primary" style="background-color: var(--color-success); color: #070913;" data-id="${staff.id}" data-action="resolve">Mark Resolved</button>`;
            }

            card.innerHTML = `
                <div class="staff-header">
                    <div class="staff-info">
                        <span class="staff-name">${staff.name}</span>
                        <span class="staff-role">${staff.role}</span>
                    </div>
                    <div class="staff-status-container">
                        <span class="dot ${statusDotColor}"></span>
                        <span style="font-family: var(--font-mono); text-transform: uppercase;">${staff.status}</span>
                    </div>
                </div>
                <div class="staff-skills">
                    ${skillsHtml}
                </div>
                <div class="staff-actions">
                    ${actionBtnHtml}
                </div>
            `;

            // Attach event listeners to buttons
            const btn = card.querySelector('button');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    const action = btn.getAttribute('data-action');
                    const id = btn.getAttribute('data-id');
                    if (action === 'dispatch') {
                        this.dispatchStaff(id, this.activeIncidentId);
                    } else if (action === 'resolve') {
                        this.resolveStaff(id);
                    }
                });
            }

            this.container.appendChild(card);
        });

        // Update duty count in header
        const activeCount = this.responders.filter(s => s.status !== 'Idle').length;
        const countHeader = document.getElementById('active-staff-count');
        if (countHeader) {
            countHeader.textContent = `${this.responders.length} Duty (${activeCount} Dispatched)`;
        }
    }
}
