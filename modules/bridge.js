// Emergency Communication Bridge & SOP Checklist Manager

export class BridgeManager {
    constructor(onSopCheckCallback) {
        this.activeIncident = null;
        this.onSopCheck = onSopCheckCallback;
        this.chatLogs = {}; // Key: incidentId, Value: array of messages
        
        // Element caching
        this.sopContainer = document.getElementById('sop-steps-container');
        this.chatTitle = document.getElementById('chat-title');
        this.chatStatus = document.getElementById('chat-status');
        this.chatMessages = document.getElementById('chat-messages-container');
        this.chatInput = document.getElementById('chat-input-field');
        this.chatSend = document.getElementById('chat-send-btn');
        this.btnBridge911 = document.getElementById('btn-bridge-911');
        
        this.is911Bridged = false;
        this.initEventListeners();
    }

    initEventListeners() {
        this.chatSend.addEventListener('click', () => this.handleSendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });

        this.btnBridge911.addEventListener('click', () => this.toggle911Bridge());
    }

    setActiveIncident(incident) {
        this.activeIncident = incident;
        
        if (!incident) {
            this.renderEmptyState();
            return;
        }

        // Enable inputs
        this.chatInput.disabled = false;
        this.chatSend.disabled = false;
        this.chatStatus.textContent = 'SECURE CHANNEL ACTIVE';
        this.chatStatus.style.color = 'var(--color-success)';

        this.chatTitle.textContent = `${incident.id} - ${incident.source}`;
        
        // Initialize chat log if empty
        if (!this.chatLogs[incident.id]) {
            this.chatLogs[incident.id] = this.getInitialMessages(incident);
        }

        this.renderSop();
        this.renderChat();
    }

    getInitialMessages(incident) {
        const timestamp = new Date();
        const initial = [
            {
                sender: 'SYSTEM',
                text: `[ALERT INGESTED] Severity: ${incident.severity.toUpperCase()}. Source: ${incident.source}. Zone: ${incident.zone}.`,
                time: timestamp
            }
        ];

        if (incident.type === 'FIRE') {
            initial.push({
                sender: 'STAFF',
                text: 'Kitchen Manager John: The grill fire got out of control. We have heavy smoke and are evacuating the restaurant. Fire suppression system deployed but fire is spreading to exhaust vents!',
                time: new Date(timestamp.getTime() + 1000)
            });
        } else if (incident.type === 'MEDICAL') {
            initial.push({
                sender: 'GUEST',
                text: 'Guest Suite 302: Help! Panic button triggered. My husband had chest pain, collapsed and is breathing very heavily. He can\'t stand up!',
                time: new Date(timestamp.getTime() + 1000)
            });
        } else if (incident.type === 'SECURITY') {
            initial.push({
                sender: 'STAFF',
                text: 'Front Desk Clerk Maya: An intoxicated customer is screaming at reception and throwing items. We need guards here immediately before they injure someone.',
                time: new Date(timestamp.getTime() + 1000)
            });
        } else {
            initial.push({
                sender: 'SENSOR',
                text: 'Pool Deck Node: Spillover splash sensor triggered. Guest reports slipping and falling near the main deck area, unable to walk.',
                time: new Date(timestamp.getTime() + 1000)
            });
        }

        return initial;
    }

    handleSendMessage() {
        const text = this.chatInput.value.trim();
        if (!text || !this.activeIncident) return;

        const timestamp = new Date();
        this.chatLogs[this.activeIncident.id].push({
            sender: 'OPERATOR',
            text: text,
            time: timestamp
        });

        this.chatInput.value = '';
        this.renderChat();

        // Simulate reply from the field
        setTimeout(() => {
            this.simulateReply(text);
        }, 1500);
    }

    simulateReply(operatorMsg) {
        if (!this.activeIncident) return;
        const msgLower = operatorMsg.toLowerCase();
        let replyText = "Understood, console. Responders on standby.";

        if (this.activeIncident.type === 'FIRE') {
            if (msgLower.includes('evac') || msgLower.includes('leave') || msgLower.includes('fire alarm')) {
                replyText = "Kitchen Manager John: Evac underway. Alarm activated. Evacuation route cleared towards the parking zone.";
            } else if (msgLower.includes('dispatch') || msgLower.includes('help') || msgLower.includes('marcus')) {
                replyText = "Kitchen Manager John: Copy that, waiting for Marshal Marcus to guide venting systems isolation.";
            } else {
                replyText = "Kitchen Manager John: We are moving guests out, but smoke is venting to Lobby hallway.";
            }
        } else if (this.activeIncident.type === 'MEDICAL') {
            if (msgLower.includes('dispatch') || msgLower.includes('way') || msgLower.includes('emt') || msgLower.includes('sarah')) {
                replyText = "Guest Suite 302: Understood. I unlocked the door. Please send the paramedic up quickly. He is breathing but dizzy.";
            } else if (msgLower.includes('calm') || msgLower.includes('breathe') || msgLower.includes('cpr')) {
                replyText = "Guest Suite 302: Okay, keeping him flat on his back. Waiting for help.";
            } else {
                replyText = "Guest Suite 302: Please hurry, the pain isn't getting any better.";
            }
        } else if (this.activeIncident.type === 'SECURITY') {
            if (msgLower.includes('guards') || msgLower.includes('dispatch') || msgLower.includes('john')) {
                replyText = "Front Desk Clerk Maya: Thank you. Security is arriving, that might calm him down. Keeping our distance.";
            } else {
                replyText = "Front Desk Clerk Maya: The individual is still aggressive. We are backing away from the counter.";
            }
        }

        const timestamp = new Date();
        this.chatLogs[this.activeIncident.id].push({
            sender: this.activeIncident.type === 'MEDICAL' ? 'GUEST' : 'STAFF',
            text: replyText,
            time: timestamp
        });

        this.renderChat();
    }

    toggle911Bridge() {
        if (this.is911Bridged) {
            // Disconnect
            this.is911Bridged = false;
            this.btnBridge911.textContent = 'Bridge 911 / Services';
            this.btnBridge911.classList.remove('connected');
            
            if (this.activeIncident) {
                this.chatLogs[this.activeIncident.id].push({
                    sender: 'SYSTEM',
                    text: '[COMMUNICATION BRIDGE DISCONNECTED] External 911 dispatch lines terminated.',
                    time: new Date()
                });
                this.renderChat();
            }
        } else {
            // Connect
            this.is911Bridged = true;
            this.btnBridge911.textContent = '911 BRIDGED';
            this.btnBridge911.classList.add('connected');

            if (this.activeIncident) {
                this.chatLogs[this.activeIncident.id].push({
                    sender: 'SYSTEM',
                    text: '[ESTABLISHING SATELLITE BRIDGE] Direct telemetry and VOIP feed connection routing to municipal emergency dispatch...',
                    time: new Date()
                });
                this.renderChat();

                setTimeout(() => {
                    if (this.is911Bridged && this.activeIncident) {
                        this.chatLogs[this.activeIncident.id].push({
                            sender: 'SYSTEM',
                            text: `[911 DISPATCH]: 911 Emergency lines active. Aegis Console telemetry received. Priority response units dispatched to resort GPS coordinates. Incident Reference: #911-${Math.floor(1000 + Math.random() * 9000)}. ETA: 5 mins.`,
                            time: new Date()
                        });
                        this.renderChat();
                    }
                }, 1500);
            }
        }
    }

    renderSop() {
        if (!this.sopContainer || !this.activeIncident) return;
        this.sopContainer.innerHTML = '';

        const steps = this.activeIncident.sop;
        steps.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = `sop-step ${step.done ? 'completed' : ''}`;
            
            stepEl.innerHTML = `
                <input type="checkbox" id="sop-chk-${index}" ${step.done ? 'checked' : ''}>
                <label for="sop-chk-${index}">${step.text}</label>
            `;

            const checkbox = stepEl.querySelector('input');
            checkbox.addEventListener('change', () => {
                step.done = checkbox.checked;
                stepEl.classList.toggle('completed', checkbox.checked);
                if (this.onSopCheck) this.onSopCheck();
            });

            this.sopContainer.appendChild(stepEl);
        });
    }

    renderChat() {
        if (!this.chatMessages || !this.activeIncident) return;
        this.chatMessages.innerHTML = '';

        const messages = this.chatLogs[this.activeIncident.id] || [];
        messages.forEach(msg => {
            const bubble = document.createElement('div');
            
            if (msg.sender === 'OPERATOR') {
                bubble.className = 'message-bubble outgoing';
            } else if (msg.sender === 'SYSTEM') {
                bubble.className = 'message-bubble system';
            } else {
                bubble.className = 'message-bubble incoming';
            }

            const timeStr = msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            bubble.innerHTML = `
                <div>${msg.text}</div>
                <div class="message-meta">
                    <span>${msg.sender}</span>
                    <span>${timeStr}</span>
                </div>
            `;

            this.chatMessages.appendChild(bubble);
        });

        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    renderEmptyState() {
        this.chatInput.disabled = true;
        this.chatSend.disabled = true;
        this.chatStatus.textContent = 'DISCONNECTED';
        this.chatStatus.style.color = 'var(--text-muted)';
        this.chatTitle.textContent = 'Communications Terminal';
        
        this.chatMessages.innerHTML = `
            <div class="chat-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <p style="margin-top: 0.5rem;">Select an active alert to initialize the emergency comms bridge.</p>
            </div>
        `;

        this.sopContainer.innerHTML = `
            <div class="chat-placeholder" style="padding: 1rem 0;">
                <p style="font-size: 0.7rem;">Select an active incident to display standard response protocols.</p>
            </div>
        `;
    }
}
