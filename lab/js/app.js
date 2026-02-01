/**
 * Pasientjournal App - Main application logic
 */
import { TooltipManager } from './TooltipManager.js';

// Initialize tooltip manager globally
window.tooltipManager = new TooltipManager();

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const patientSelect = document.getElementById('patient-select');
const documentsList = document.getElementById('documents-list');
const viewerContent = document.getElementById('viewer-content');

// State
let conversationHistory = [];
let welcomeVisible = true;
let selectedPatient = null;
let selectedPatientName = '';
let fhirData = { patients: [], documents: [] };
let currentDocuments = [];

// Sample rich document data (will be replaced with real data later)
const sampleRichContent = {
  'doc-001': {
    summary: 'Pasienten ble innlagt akutt med symptomer på pneumoni. Behandlet med antibiotika og oksygentilskudd. Utskrevet etter 5 dager med bedring.',
    keyVariables: {
      'Diagnose': 'Pneumoni (J18.9)',
      'Behandling': 'Amoxicillin 500mg x3',
      'Innleggelse': '10. nov 2025',
      'Utskrivelse': '15. nov 2025'
    },
    sections: [
      {
        title: 'Innkomst',
        content: 'Pasienten kom inn til akuttmottaket med feber, hoste og tungpustethet. Undersøkt av <practitioner id="pract-001">Dr. Anders Johannesen</practitioner> som mistenkte <health type="diagnosis" code="J18.9">pneumoni</health>.'
      },
      {
        title: 'Behandling',
        content: 'Startet på <health type="medication" code="J01CA04">amoxicillin</health> 500mg x3 daglig. Pasienten fikk også <health type="medication" code="R03AC02">oksygentilskudd</health> via nesekateter.'
      },
      {
        title: 'Utskrivelse',
        content: 'Etter 5 dagers behandling viste pasienten god bedring. CRP falt fra 180 til 25. Utskrevet med fortsatt <health type="medication" code="J01CA04">amoxicillin</health> i ytterligere 5 dager.'
      }
    ],
    practitioners: [
      {
        id: 'pract-001',
        name: 'Dr. Anders Johannesen',
        role: 'Behandlende lege',
        profession: 'Spesialist i indremedisin',
        hospital: 'Oslo Universitetssykehus',
        department: 'Lungemedisinsk avdeling',
        phone: '+47 23 07 00 00',
        email: 'anders.johannesen@ous-hf.no'
      }
    ]
  }
};

// Load initial data
export async function loadData() {
  try {
    // Load static synthetic data
    const fhirResponse = await fetch('/api/fhir/summary');
    const fhirSummary = await fhirResponse.json();

    // Load generated data
    const generatedPatientsRes = await fetch('/api/generated/Patient');
    const generatedPatients = await generatedPatientsRes.json();

    // Combine static and generated
    fhirData.patients = [
      ...fhirSummary.patients,
      ...(generatedPatients.entry || []).map(e => ({
        id: e.resource.id,
        name: e.resource.name[0].given.join(' ') + ' ' + e.resource.name[0].family,
        birthDate: e.resource.birthDate
      }))
    ];

    renderPatients();
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

function renderPatients() {
  const options = fhirData.patients.map(p =>
    `<option value="${p.id}" ${selectedPatient === p.id ? 'selected' : ''}>${p.name}</option>`
  ).join('');
  patientSelect.innerHTML = '<option value="">Velg pasient...</option>' + options;
}

window.selectPatientFromDropdown = function() {
  const patientId = patientSelect.value;
  if (!patientId) {
    selectedPatient = null;
    selectedPatientName = '';
    documentsList.innerHTML = '<p style="font-size: 0.8rem; color: #999; padding: 1rem;">Velg en pasient</p>';
    return;
  }
  const patient = fhirData.patients.find(p => p.id === patientId);
  if (patient) {
    selectPatient(patient.id, patient.name);
  }
}

async function selectPatient(patientId, patientName) {
  selectedPatient = patientId;
  selectedPatientName = patientName;
  renderPatients();

  // Load documents for this patient
  let docs = [];

  // Try static data
  const staticRes = await fetch(`/api/fhir/DocumentReference?patient=${patientId}`);
  const staticDocs = await staticRes.json();
  if (staticDocs.entry) docs.push(...staticDocs.entry.map(e => e.resource));

  // Try generated data
  const genRes = await fetch(`/api/generated/DocumentReference?patient=${patientId}`);
  const genDocs = await genRes.json();
  if (genDocs.entry) docs.push(...genDocs.entry.map(e => e.resource));

  currentDocuments = docs;
  renderDocuments(docs);
}

function renderDocuments(docs) {
  if (docs.length === 0) {
    documentsList.innerHTML = '<p style="font-size: 0.8rem; color: #999; padding: 1rem;">Ingen dokumenter</p>';
    return;
  }

  documentsList.innerHTML = docs.map((d, idx) => `
    <div class="document-item" onclick="viewDocument(${idx})">
      <h4>${d.description}</h4>
      <div class="doc-meta">${new Date(d.date).toLocaleDateString('no-NO')}</div>
      <span class="doc-type">${d.type.coding[0].display}</span>
    </div>
  `).join('');
}

window.generatePatient = async function() {
  const name = prompt('Navn på pasienten (eller la stå tomt for tilfeldig):') || '';
  const url = name ? `/api/generate/patient?name=${encodeURIComponent(name)}` : '/api/generate/patient';

  try {
    const res = await fetch(url);
    const data = await res.json();
    alert(`Genererte: ${data.patient.name[0].given.join(' ')} ${data.patient.name[0].family}\n${data.documents.length} dokumenter opprettet`);
    loadData();
  } catch (err) {
    alert('Feil ved generering: ' + err.message);
  }
}

function processClickableContent(html) {
  // Replace <practitioner> tags
  html = html.replace(/<practitioner id="([^"]+)">([^<]+)<\/practitioner>/g, (match, id, name) => {
    return `<span class="clickable-practitioner" onclick="showPractitionerTooltip(event, '${id}')">${name}</span>`;
  });

  // Replace <health> tags
  html = html.replace(/<health type="([^"]+)" code="([^"]+)">([^<]+)<\/health>/g, (match, type, code, text) => {
    return `<span class="clickable-health" onclick="showHealthTooltip(event, '${type}', '${code}', '${text}')">${text}</span>`;
  });

  return html;
}

window.viewDocument = function(docIndex) {
  const doc = currentDocuments[docIndex];
  if (!doc) return;

  const richData = sampleRichContent[doc.id];

  if (richData) {
    // Render rich document
    const sectionsHTML = richData.sections.map(section => `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="color: #333; font-size: 1rem; margin-bottom: 0.5rem;">${section.title}</h3>
        <p style="line-height: 1.6; color: #555;">${processClickableContent(section.content)}</p>
      </div>
    `).join('');

    const keyVarsHTML = Object.entries(richData.keyVariables).map(([key, value]) =>
      `<div style="margin-bottom: 0.5rem;"><strong>${key}:</strong> ${value}</div>`
    ).join('');

    viewerContent.innerHTML = `
      <div class="viewer-content">
        <h2 style="color: #dc2626; margin-bottom: 1rem;">${doc.description}</h2>
        <div style="font-size: 0.875rem; color: #666; margin-bottom: 1.5rem;">
          <strong>Type:</strong> ${doc.type.coding[0].display}<br>
          <strong>Dato:</strong> ${new Date(doc.date).toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
          <strong>Pasient:</strong> ${selectedPatientName}
        </div>

        <div style="background: #fef3c7; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.875rem;">
          <strong style="display: block; margin-bottom: 0.5rem;">Nøkkelinformasjon</strong>
          ${keyVarsHTML}
        </div>

        <div style="background: #f9fafb; padding: 1.5rem; border-radius: 6px; border-left: 3px solid #dc2626;">
          <strong style="display: block; margin-bottom: 1rem; color: #333;">Sammendrag</strong>
          <p style="margin-bottom: 1.5rem; line-height: 1.6; color: #555;">${richData.summary}</p>

          <strong style="display: block; margin-bottom: 1rem; color: #333;">Detaljer</strong>
          ${sectionsHTML}
        </div>

        <button onclick="askAboutDocument('${doc.description.replace(/'/g, "\\'")}')"
                style="margin-top: 1.5rem; background: #dc2626; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">
          Still spørsmål om dokumentet
        </button>
      </div>
    `;
  } else {
    // Basic fallback
    viewerContent.innerHTML = `
      <div class="viewer-content">
        <h2 style="color: #dc2626; margin-bottom: 1rem;">${doc.description}</h2>
        <div style="font-size: 0.875rem; color: #666; margin-bottom: 1.5rem;">
          <strong>Type:</strong> ${doc.type.coding[0].display}<br>
          <strong>Dato:</strong> ${new Date(doc.date).toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
          <strong>Forfatter:</strong> ${doc.author ? doc.author[0].display : 'Ukjent'}
        </div>

        <div style="background: #f9fafb; padding: 1.5rem; border-radius: 6px; border-left: 3px solid #dc2626;">
          <p style="margin: 0; line-height: 1.6;">
            Dette er et ${doc.type.coding[0].display.toLowerCase()} for ${selectedPatientName}.<br><br>
            <em style="color: #666;">Rikt innhold ikke tilgjengelig for dette dokumentet.</em>
          </p>
        </div>

        <button onclick="askAboutDocument('${doc.description.replace(/'/g, "\\'")}')"
                style="margin-top: 1.5rem; background: #dc2626; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer;">
          Still spørsmål om dokumentet
        </button>
      </div>
    `;
  }
}

window.showPractitionerTooltip = function(event, practId) {
  event.stopPropagation();

  // Find practitioner in current rich data
  let practitioner = null;
  for (const docId in sampleRichContent) {
    const richData = sampleRichContent[docId];
    if (richData.practitioners) {
      practitioner = richData.practitioners.find(p => p.id === practId);
      if (practitioner) break;
    }
  }

  if (!practitioner) return;

  const content = `
    <div style="font-size: 0.875rem;">
      <div style="margin-bottom: 0.75rem;">
        <strong style="color: #dc2626;">${practitioner.name}</strong>
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>Rolle:</strong> ${practitioner.role}
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>Profesjon:</strong> ${practitioner.profession}
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>Sykehus:</strong> ${practitioner.hospital}
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>Avdeling:</strong> ${practitioner.department}
      </div>
      <hr style="margin: 0.75rem 0; border: none; border-top: 1px solid #e5e5e5;">
      <div style="margin-bottom: 0.25rem;">
        <strong>Telefon:</strong> ${practitioner.phone}
      </div>
      <div>
        <strong>E-post:</strong> ${practitioner.email}
      </div>
    </div>
  `;

  window.tooltipManager.create(practitioner.name, content, { x: event.pageX + 10, y: event.pageY + 10 });
}

window.showHealthTooltip = function(event, type, code, text) {
  event.stopPropagation();

  const typeLabels = {
    'diagnosis': 'Diagnose',
    'medication': 'Medisin',
    'procedure': 'Prosedyre',
    'condition': 'Tilstand'
  };

  const content = `
    <div style="font-size: 0.875rem;">
      <div style="margin-bottom: 0.75rem;">
        <strong style="color: #059669; text-transform: capitalize;">${typeLabels[type] || type}</strong>
      </div>
      <div style="margin-bottom: 0.5rem;">
        <strong>Navn:</strong> ${text}
      </div>
      <div style="margin-bottom: 0.75rem;">
        <strong>Kode:</strong> ${code}
      </div>
      <div style="background: #f0fdf4; padding: 0.75rem; border-radius: 4px; border-left: 3px solid #059669;">
        <em style="color: #666;">
          Kontekstuell forklaring vil vises her.
          Inkluderer informasjon fra pasientens øvrige data.
        </em>
      </div>
    </div>
  `;

  window.tooltipManager.create(text, content, { x: event.pageX + 10, y: event.pageY + 10 });
}

window.askAboutDocument = function(description) {
  chatInput.value = `Fortell meg om dokumentet: ${description}`;
  chatInput.focus();
}

function addMessage(content, role, usage = null) {
  if (welcomeVisible) {
    chatMessages.innerHTML = '';
    welcomeVisible = false;
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  let metaInfo = '';
  if (usage && role === 'assistant') {
    metaInfo = `<div class="message-meta">${usage.input_tokens + usage.output_tokens} tokens</div>`;
  }

  messageDiv.innerHTML = `
    <div class="message-content">${formatMessage(content)}</div>
    ${metaInfo}
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessage(text) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function showTyping() {
  const typing = document.createElement('div');
  typing.className = 'typing-indicator show';
  typing.id = 'typing';
  typing.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.value = '';
  sendBtn.disabled = true;

  addMessage(message, 'user');
  showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory
      })
    });

    const data = await response.json();
    hideTyping();

    if (data.error) {
      addMessage(`Feil: ${data.error}`, 'assistant');
    } else {
      addMessage(data.response, 'assistant', data.usage);
      conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: data.response }
      );
    }
  } catch (error) {
    hideTyping();
    addMessage(`Tilkoblingsfeil: ${error.message}`, 'assistant');
  }

  sendBtn.disabled = false;
  chatInput.focus();
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Initialize
loadData();
