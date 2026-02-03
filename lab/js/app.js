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
const documentsList = document.getElementById('documents-list');
const viewerContent = document.getElementById('viewer-content');

// Mockup patient data using Kari Hansen's information
const mockupDocuments = [
  {
    id: 'doc-001',
    description: 'Epikrise etter innleggelse for pneumoni',
    date: '2025-11-15T14:30:00Z',
    type: {
      coding: [{
        display: 'Epikrise'
      }]
    }
  },
  {
    id: 'doc-002',
    description: 'Blodprøver - årlig kontroll',
    date: '2025-12-02T09:15:00Z',
    type: {
      coding: [{
        display: 'Laboratoriesvar'
      }]
    }
  },
  {
    id: 'doc-007',
    description: 'Kontrolltime - oppfølging etter pneumoni',
    date: '2026-01-15T13:20:00Z',
    type: {
      coding: [{
        display: 'Journalnotat'
      }]
    }
  }
];

// State
let conversationHistory = [];
let welcomeVisible = true;
let selectedPatient = null;
let selectedPatientName = '';
let fhirData = {
  patients: [
    {
      id: 'patient-001',
      name: 'Kari Marie Hansen',
      birthDate: '1978-05-13'
    }
  ],
  documents: []
};
let currentDocuments = [];
let allDocuments = mockupDocuments;

// Sample rich document data for Kari Hansen
const sampleRichContent = {
  'doc-001': {
    summary: 'Kari Hansen (67 år) ble innlagt akutt med symptomer på pneumoni. Behandlet med antibiotika og oksygentilskudd. Utskrevet etter 5 dager med bedring.',
    keyVariables: {
      'Diagnose': 'Pneumoni (J18.9)',
      'Behandling': 'Amoxicillin 500mg x3',
      'Innleggelse': '10. nov 2025',
      'Utskrivelse': '15. nov 2025'
    },
    sections: [
      {
        title: 'Innkomst',
        content: 'Kari Hansen kom inn til akuttmottaket med feber, hoste og tungpustethet. Undersøkt av <practitioner id="pract-001">Dr. Anders Johannesen</practitioner> som mistenkte <health type="diagnosis" code="J18.9">pneumoni</health>.'
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
  },
  'doc-002': {
    summary: 'Blodprøver - årlig kontroll for Kari Hansen.',
    keyVariables: {
      'Dato': '2. des 2025',
      'Type': 'Laboratoriesvar',
      'Resultat': 'Normalt'
    },
    sections: [
      {
        title: 'Hematologi',
        content: 'Hemoglobin: 13.8 g/dL (normalt). Leukocytter: 6.2 x10^9/L (normalt). Trombocytter: 245 x10^9/L (normalt).'
      },
      {
        title: 'Klinisk kjemi',
        content: 'Kreatinin: 78 µmol/L (normalt). ALAT: 22 U/L (normalt). CRP: <5 mg/L (normalt).'
      },
      {
        title: 'Konklusjon',
        content: 'Alle verdier innenfor normalområdet. Ingen tegn til betennelse eller organsvikt.'
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
  },
  'doc-007': {
    summary: 'Oppfølging etter pneumoni. Kari Hansen møtte til kontroll. Bedring i symptomer, lungefunksjon normalisert.',
    keyVariables: {
      'Dato': '22. nov 2025',
      'Tilstand': 'God bedring',
      'Videre plan': 'Ingen oppfølging nødvendig'
    },
    sections: [
      {
        title: 'Anamnese',
        content: 'Kari rapporterer god bedring siden utskrivelsen. Hoste er betydelig redusert, ingen feber. Daglige aktiviteter gjenopptatt.'
      },
      {
        title: 'Undersøkelse',
        content: 'Auskultasjon av lunger viser normale respirasjonslyder. Ingen tegn til residiverende infeksjon. Saturasjon 98% på romluft.'
      },
      {
        title: 'Vurdering',
        content: 'Pneumonien er helbredet. Ingen tegn til komplikasjoner. Pasienten kan gjenoppta normal aktivitet.'
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

// Load initial data - using mockup data
export async function loadData() {
  // Patient data is already initialized in fhirData
  // Automatically load documents for Kari Hansen
  currentDocuments = mockupDocuments;

  // Render documents directly
  if (documentsList) {
    documentsList.innerHTML = mockupDocuments.map((d, idx) => `
      <div class="document-item" onclick="viewDocument(${idx})">
        <h4>${d.description}</h4>
        <div class="doc-meta">${new Date(d.date).toLocaleDateString('no-NO')}</div>
        <span class="doc-type">${d.type.coding[0].display}</span>
      </div>
    `).join('');
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

  // Use documents from loaded data
  currentDocuments = allDocuments;
  renderDocuments(allDocuments);
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
    // Render rich document with dark mode colors
    const sectionsHTML = richData.sections.map(section => `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="color: #e8e8e8; font-size: 1rem; margin-bottom: 0.5rem;">${section.title}</h3>
        <p style="line-height: 1.6; color: #e8e8e8;">${processClickableContent(section.content)}</p>
      </div>
    `).join('');

    const keyVarsHTML = Object.entries(richData.keyVariables).map(([key, value]) =>
      `<div style="margin-bottom: 0.5rem; color: #e8e8e8;"><strong>${key}:</strong> ${value}</div>`
    ).join('');

    viewerContent.innerHTML = `
      <div class="viewer-content">
        <h2 style="color: #c9a08b; margin-bottom: 1rem;">${doc.description}</h2>
        <div style="font-size: 0.875rem; color: #a0a0a0; margin-bottom: 1.5rem;">
          <strong>Type:</strong> ${doc.type.coding[0].display}<br>
          <strong>Dato:</strong> ${new Date(doc.date).toLocaleDateString('no-NO', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
          <strong>Pasient:</strong> Kari Marie Hansen
        </div>

        <div style="background: rgba(201, 160, 139, 0.15); padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.875rem; border: 1px solid rgba(201, 160, 139, 0.3);">
          <strong style="display: block; margin-bottom: 0.5rem; color: #c9a08b;">Nøkkelinformasjon</strong>
          ${keyVarsHTML}
        </div>

        <div style="background: #2a2a2a; padding: 1.5rem; border-radius: 6px; border-left: 3px solid #c9a08b;">
          <strong style="display: block; margin-bottom: 1rem; color: #e8e8e8;">Sammendrag</strong>
          <p style="margin-bottom: 1.5rem; line-height: 1.6; color: #e8e8e8;">${richData.summary}</p>

          <strong style="display: block; margin-bottom: 1rem; color: #e8e8e8;">Detaljer</strong>
          ${sectionsHTML}
        </div>

        <button onclick="askAboutDocument('${doc.description.replace(/'/g, "\\'")}')"
                style="margin-top: 1.5rem; background: #c9a08b; color: #1a1a1a; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-weight: 500;">
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
