/*
  Einfacher JavaScript‑Controller für die Single‑User‑Prompt‑Battle‑Version.
  Er lädt den API‑Schlüssel, zeigt ein Eingabefeld an und verarbeitet
  Benutzereingaben, indem er sie an die OpenAI‑API sendet. Die Antworten
  werden anschließend im Chatbereich angezeigt. Das Layout ist identisch mit
  der Pink‑Variante; nur die Farben werden über die CSS‑Datei gesteuert.
*/

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('apiKeyModal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  // API‑Key aus lokalem Speicher laden. Dieser Wert wird sowohl vom
  // Eingabebereich unten als auch von der modalen Eingabe verwendet.
  let apiKey = localStorage.getItem('openai_api_key');

  function showApiKeyModal() {
    modal.style.display = 'block';
  }
  function hideApiKeyModal() {
    modal.style.display = 'none';
  }
  // Wenn noch kein API‑Key vorhanden ist, wird kein Modal mehr automatisch
  // angezeigt. Stattdessen kann der Schlüssel jederzeit im unteren Eingabe‑
  // bereich eingetragen und gespeichert werden. Der Modaldialog bleibt
  // weiterhin verfügbar (Ctrl+K) als alternative Möglichkeit zur Eingabe.
  saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem('openai_api_key', key);
      apiKey = key;
      hideApiKeyModal();
      // Synchronisiere auch das untere Passwortfeld mit dem neuen Schlüssel
      const barInput = document.getElementById('apiKeyBarInput');
      if (barInput) barInput.value = key;
    }
  });

  // Vollbild‑Eingabe und Ergebnis‑Overlay referenzieren
  const promptInput = document.getElementById('prompt');
  const resultModal = document.getElementById('resultModal');
  const resultContent = document.getElementById('resultContent');

  // Zeigt eine Warnung an, wenn die Seite über file:// geöffnet wurde. In diesem
  // Fall müssen wir auf einen lokalen Webserver wechseln. Die Warnung wird im
  // Ergebnismodal angezeigt.
  function warnIfFileProtocol() {
    if (window.location.protocol === 'file:') {
      showResult(
        'Diese Anwendung funktioniert nicht, wenn sie direkt über eine lokale Datei (file://) geöffnet wird. Bitte starte einen lokalen Webserver (z.\u00a0B. mit "python -m http.server" im Projektordner) und öffne die Seite über http://localhost:PORT.'
      );
      return true;
    }
    return false;
  }

  // Zeigt den Ergebnismodal an und setzt den Inhalt. Wenn ein Element (z. B. Bild) übergeben
  // wird, wird es direkt eingesetzt, ansonsten wird Text angezeigt.
  function showResult(content) {
    // Leere vorherige Inhalte
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

  async function sendPrompt() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    // Leere das Eingabefeld nach dem Absenden
    promptInput.value = '';
    if (!apiKey) {
      showResult('Kein API‑Schlüssel gefunden. Bitte gib deinen Schlüssel unten ein.');
      return;
    }
    // Warnung bei file://
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
          /* JSON parse errors werden ignoriert */
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const imageUrl = data.data && data.data[0] && data.data[0].url;
      if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = prompt;
        showResult(img);
      } else {
        showResult('Es wurde kein Bild zurückgegeben.');
      }
    } catch (error) {
      console.error(error);
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        showResult('Fehler: Die Anfrage konnte nicht gesendet werden. Dies kann an der CORS‑Policy liegen. Starte die Seite über einen lokalen Webserver oder überprüfe deine Internetverbindung.');
      } else {
        showResult(`Fehler bei der Kommunikation mit der API: ${error.message}`);
      }
    }
  }

  // Beim Drücken von Enter wird der Prompt abgeschickt. Mit Shift+Enter kann
  // man weiterhin einen Zeilenumbruch einfügen (falls gewünscht).
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  });

  // Modal schließen, wenn außerhalb geklickt oder Escape gedrückt wird
  resultModal.addEventListener('click', (event) => {
    // Schließe nur, wenn man direkt auf den Hintergrund klickt (nicht auf das Bild)
    if (event.target === resultModal) {
      hideResult();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideResult();
      hideApiKeyModal();
    }
    // Öffne den API‑Key‑Dialog mit Ctrl+K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      showApiKeyModal();
    }
  });

  // Setze den Fokus auf das Eingabefeld, damit sofort geschrieben werden kann.
  promptInput.focus();

  // *** API‑Key‑Bar Funktionslogik ***
  const bar = document.getElementById('apiKeyBar');
  const barInput = document.getElementById('apiKeyBarInput');
  const barSaveBtn = document.getElementById('saveApiKeyBar');
  // Bei bestehendem Schlüssel im Speicher fülle das Passwortfeld vor
  if (apiKey && barInput) {
    barInput.value = apiKey;
  }
  function saveKeyFromBar() {
    const key = barInput.value.trim();
    if (key) {
      localStorage.setItem('openai_api_key', key);
      apiKey = key;
      // Synchronisiere auch das Modal‑Feld
      const modalInput = document.getElementById('apiKeyInput');
      if (modalInput) modalInput.value = key;
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