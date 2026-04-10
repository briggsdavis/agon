// -------------------------------------------------------
// STEP 1: Paste your Supabase credentials here
// Find them at: supabase.com → your project → Settings → API
// -------------------------------------------------------
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -------------------------------------------------------
// Save a note to the database
// -------------------------------------------------------
async function saveNote() {
  const input = document.getElementById('note-input');
  const status = document.getElementById('status');
  const content = input.value.trim();

  if (!content) {
    status.textContent = 'Please write something first.';
    return;
  }

  status.textContent = 'Saving...';

  const { error } = await supabase
    .from('notes')
    .insert([{ content }]);

  if (error) {
    console.error(error);
    status.textContent = 'Error saving note. Check the console.';
    return;
  }

  input.value = '';
  status.textContent = 'Note saved!';
  fetchNotes();
}

// -------------------------------------------------------
// Fetch all notes and display them on the page
// -------------------------------------------------------
async function fetchNotes() {
  const list = document.getElementById('notes-list');

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('id', { ascending: false }); // newest first

  if (error) {
    console.error(error);
    list.textContent = 'Could not load notes. Check the console.';
    return;
  }

  if (data.length === 0) {
    list.innerHTML = '<p>No notes yet — add one above!</p>';
    return;
  }

  list.innerHTML = data
    .map(note => `<div class="note-card">${note.content}</div>`)
    .join('');
}

// Load notes when the page first opens
fetchNotes();
