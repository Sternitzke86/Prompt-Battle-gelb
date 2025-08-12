/*
  Einfacher JavaScript‑Controller für die Single‑User‑Prompt‑Battle‑Version.
  Der API‑Schlüssel wird nicht im Code hinterlegt, sondern vom Nutzer
  eingegeben und im lokalen Speicher gespeichert. Nach Eingabe oder Änderung
  kann der Schlüssel im unteren Eingabebereich oder über Ctrl+K eingegeben werden.
  Das Skript sendet Prompts an die OpenAI‑API und zeigt generierte Bilder
  sowie Prompts im Chat‑Verlauf an. Bilder lassen sich per Klick vergrößern,
  wobei das Overlay die Hintergrundfarbe der jeweiligen Farbvariante nutzt.
*/

function enhancePrompt(userText) {
  const boost = " detailed, realistic lighting, natural colors";
  return userText.trim() + "," + boost;
}

document.addEventListener('DOMContentLoaded', () => {
  // Referenzen auf Modal und dessen Eingabefelder für den API‑Schlüssel
  const modal = document.getElementById('apiKeyModal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');

  // Lade einen eventuell zuvor gespeicherten API‑Schlüssel aus dem lokalen Speicher.
  let apiKey = localStorage.getItem('openai_api_key');

  // Zeige bzw. verberge den API‑Key‑Dialog
  function showApiKeyModal() {
    if (modal) modal.style.display = 'block';
  }
  function hideApiKeyModal() {
    if (modal) modal.style.display = 'none';
  }

  // Speichere den API‑Key aus dem Modalfenster im lokalen Speicher
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', () => {
      const key = apiKeyInput.value.trim();
      if (key) {
        localStorage.setItem('openai_api_key', key);
        apiKey = key;
        hideApiKeyModal();
        // Synchronisiere auch das Passwortfeld im unteren Eingabebereich
        const barInput = document.getElementById('apiKeyBarInput');
        if (barInput) barInput.value = key;
      }
    });
  }

  // Elemente für das Prompt‑Eingabefeld, das Ergebnis‑Overlay und die Nachrichtenliste
  const promptInput = document.getElementById('prompt');
  const resultModal = document.getElementById('resultModal');
  const resultContent = document.getElementById('resultContent');
  const messagesContainer = document.getElementById('messages');

  // Warnung, wenn die Seite über file:// geladen wurde
  function warnIfFileProtocol() {
    if (window.location.protocol === 'file:') {
      showResult(
        'Diese Anwendung funktioniert nicht, wenn sie direkt über eine lokale Datei (file://) geöffnet wird. Bitte starte einen lokalen Webserver (z.\u00a0B. mit "python -m http.server" im Projektordner) und öffne die Seite über http://localhost:PORT.'
      );
      return true;
    }
    return false;
  }

  // Anzeige eines Ergebnisses im Overlay (Bild oder Fehlermeldung)
  function showResult(content) {
    resultContent.innerHTML = '';
    if (typeof content === 'string') {
      const p = document.createElement('p');
      p.textContent = content;
      resultContent.appendChild(p);
    } else if (content instanceof HTMLElement) {
      resultContent.appendChild(content);
    }
    resultModal.style.display = 'flex';
  }
  function hideResult() {
    resultModal.style.display = 'none';
  }

  // Hauptfunktion zum Senden eines Prompts an die OpenAI‑API
  async function sendPrompt() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    if (!apiKey) {
      showResult('Kein API‑Schlüssel gefunden. Bitte gib deinen Schlüssel unten ein.');
      return;
    }
    // Erstelle eine neue Nachricht im Chatverlauf
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    const promptPara = document.createElement('p');
    promptPara.className = 'prompt-text';
    promptPara.textContent = prompt;
    messageDiv.appendChild(promptPara);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    promptInput.value = '';
    // Bei direktem file:// Zugriff abbrechen
    if (warnIfFileProtocol()) return;
    const payload = {
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid',
      response_format: 'url'
    };
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        let errorMsg = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error && errorData.error.message) {
            errorMsg = `${errorMsg}: ${errorData.error.message}`;
          }
        } catch (e) {
          /* ignore JSON parse errors */
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const imageUrl = data.data && data.data[0] && data.data[0].url;
      if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = prompt;
        img.addEventListener('click', () => {
          showResult(img.cloneNode(true));
        });
        messageDiv.appendChild(img);
      } else {
        const errorP = document.createElement('p');
        errorP.textContent = 'Es wurde kein Bild zurückgegeben.';
        messageDiv.appendChild(errorP);
      }
    } catch (error) {
      console.error(error);
      const errorP = document.createElement('p');
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        errorP.textContent = 'Fehler: Die Anfrage konnte nicht gesendet werden. Dies kann an der CORS‑Policy liegen. Starte die Seite über einen lokalen Webserver oder überprüfe deine Internetverbindung.';
      } else {
        errorP.textContent = `Fehler bei der Kommunikation mit der API: ${error.message}`;
      }
      messageDiv.appendChild(errorP);
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Enter ohne Shift sendet den Prompt
  function autoGrow(){
  promptInput.style.height='auto';
  const max = Math.floor(window.innerHeight*0.6);
  const h = Math.min(promptInput.scrollHeight, max);
  promptInput.style.height = h + 'px';
}
promptInput.addEventListener('input', autoGrow);
setTimeout(autoGrow, 0);

promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  });

  // Klick auf das Overlay schließt es wieder (wenn außerhalb des Bildes)
  resultModal.addEventListener('click', (event) => {
    if (event.target === resultModal) {
      hideResult();
    }
  });
  // Escape schließt Modal und gegebenenfalls das API‑Key‑Modal
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideResult();
      hideApiKeyModal();
    }
    // Öffne den API‑Key‑Dialog mit Ctrl+K / Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      showApiKeyModal();
    }
  });

  // Direkt nach Laden: Fokus auf das Promptfeld
  promptInput.focus();

  // Logik für den unteren API‑Key‑Eingabebereich
  const barInput = document.getElementById('apiKeyBarInput');
  const barSaveBtn = document.getElementById('saveApiKeyBar');
  if (apiKey && barInput) {
    barInput.value = apiKey;
  }
  function saveKeyFromBar() {
    const key = barInput.value.trim();
    if (key) {
      localStorage.setItem('openai_api_key', key);
      apiKey = key;
      // Synchronisiere auch das Modal
      if (apiKeyInput) apiKeyInput.value = key;
    }
  }
  if (barSaveBtn) {
    barSaveBtn.addEventListener('click', () => {
      saveKeyFromBar();
    });
  }
  if (barInput) {
    barInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveKeyFromBar();
      }
    });
  }
});