import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-VjZUADjcyhkIkjbfrawWPH8x5yoSpRg",
  authDomain: "mueve-seguro-mty.firebaseapp.com",
  projectId: "mueve-seguro-mty",
  storageBucket: "mueve-seguro-mty.firebasestorage.app",
  messagingSenderId: "725703293896",
  appId: "1:725703293896:web:735e1ac3146d7a9702defd",
  measurementId: "G-YLH38FYP20"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const reportsCollection = collection(db, "reportes");

let reports = [];
let currentFilter = 'Todos';

const form = document.getElementById('complaintForm');
const listContainer = document.getElementById('complaintsList');
const filterButtons = document.querySelectorAll('.filter-btn');

// Evita inyección de HTML
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Formatea la fecha de Firestore
function formatDate(timestamp) {
  if (!timestamp) return 'Justo ahora';
  const date = timestamp.toDate();
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderReports() {
  const filtered = currentFilter === 'Todos'
    ? reports
    : reports.filter(r => r.category === currentFilter);

  if (filtered.length === 0) {
    listContainer.innerHTML = `<p style="color: #64748b; padding: 1rem;">Aún no hay reportes en esta categoría. ¡Sé el primero en publicar!</p>`;
    return;
  }

  listContainer.innerHTML = filtered.map(report => `
    <article class="complaint-card">
      <div class="complaint-meta">
        <span class="complaint-author">${escapeHTML(report.author)}</span>
        <div class="complaint-tags">
          <span class="tag tag-zone">📍 ${escapeHTML(report.zone)}</span>
          <span class="tag tag-cat">${escapeHTML(report.category)}</span>
        </div>
      </div>
      <p class="complaint-text">${escapeHTML(report.message)}</p>
      <div class="complaint-footer">
        <span>${formatDate(report.createdAt)}</span>
        <button class="vote-btn" onclick="addVote('${report.id}')">
          👍 Me ha pasado (${report.votes})
        </button>
      </div>
    </article>
  `).join('');
}

// Escuchar cambios en tiempo real desde Firebase
const q = query(reportsCollection, orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  reports = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
  renderReports();
}, (error) => {
  console.error("Error al cargar reportes:", error);
  listContainer.innerHTML = `<p style="color: #ef4444; padding: 1rem;">Error al conectar con la base de datos. Revisa la consola (F12).</p>`;
});

// Sumar voto de apoyo en Firebase
window.addVote = async function (id) {
  try {
    const reportRef = doc(db, "reportes", id);
    await updateDoc(reportRef, {
      votes: increment(1)
    });
  } catch (error) {
    console.error("Error al votar:", error);
  }
};

// Publicar nueva queja en Firebase
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  const authorInput = document.getElementById('author').value.trim();
  const zone = document.getElementById('zone').value;
  const category = document.getElementById('category').value;
  const message = document.getElementById('message').value.trim();

  if (!message) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Publicando...';

  try {
    await addDoc(reportsCollection, {
      author: authorInput || 'Anónimo',
      zone,
      category,
      message,
      votes: 1,
      createdAt: serverTimestamp()
    });

    form.reset();

    // Regresa al filtro "Todos" para ver el nuevo reporte
    currentFilter = 'Todos';
    filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'Todos');
    });
  } catch (error) {
    console.error("Error al publicar:", error);
    alert("No se pudo publicar la queja. Revisa la consola (F12).");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publicar queja';
  }
});

// Cambiar filtros
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderReports();
  });
});