import { createClient } from '@supabase/supabase-js'

async function generatePDF() {
  if (!window.jspdf) {
    alert('PDF generation library not loaded. Please try again.')
    return
  }

  const { jsPDF } = window.jspdf
  const pdf = new jsPDF('p', 'mm', 'a4')

  const activeTab = document.querySelector('#preview-modal .tab-pane.active')
  let contentElement
  let filename = 'resume.pdf'

  if (activeTab && activeTab.id === 'cover-letter-preview-tab') {
    contentElement = document.getElementById('cover-letter-preview-container')
    filename = 'cover-letter.pdf'
  } else {
    contentElement = document.getElementById('resume-preview-container')
    filename = 'resume.pdf'
  }

  if (!contentElement) {
    alert('Nothing to export.')
    return
  }

  await pdf.html(contentElement, {
    callback: function (doc) {
      doc.save(filename)
    },
    margin: [10, 10, 10, 10],
    autoPaging: 'text',
    html2canvas: { 
      scale: 0.275,
      useCORS: true,
      allowTaint: true,
      letterRendering: true,
      width: 700,
      height: 900
    },
    x: 5,
    y: 5,
    width: 190,
    windowWidth: 650
  })
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

let user = await getUser()
if (!user) {
  console.warn('⚠️ No Supabase user session detected. Using test UUID.')
  user = { id: '00000000-0000-4000-8000-000000000000' }
}

const form = document.getElementById('resume-form')
const resumeTableBody = document.querySelector('#resume-table tbody')
const getStartedBtn = document.getElementById('get-started')
const resumeModal = document.getElementById('resume-modal')
const closeResumeModalBtn = document.getElementById('close-resume-modal')

await loadResumes()

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const resumeData = {
    user_id: user.id,
    resume_name: form['resume-name'].value,
    full_name: form['full-name'].value,
    profile: form['profile'].value,
    skills: form['skills'].value,
    experience: form['experience'].value,
    education: form['education'].value,
    referees: form['referees'].value,
    cover_letter: form['cover-letter'].value,
  }

  const id = form['resume-id'].value
  if (id) {
    await supabase.from('resumes').update(resumeData).eq('id', id)
  } else {
    await supabase.from('resumes').insert(resumeData)
  }

  await loadResumes()
  form.reset()
  resumeModal.classList.add('hidden')
})

document.getElementById('clear-form').addEventListener('click', () => {
  form.reset()
})

getStartedBtn?.addEventListener('click', () => {
  resumeModal.classList.remove('hidden')
  const modalContent = resumeModal.querySelector('.modal-content')
  if (modalContent) {
    modalContent.scrollTop = 0
  }
  initializeTabs()
})

closeResumeModalBtn?.addEventListener('click', () => {
  resumeModal.classList.add('hidden')
})

document.getElementById('modal-close-x')?.addEventListener('click', () => {
  resumeModal.classList.add('hidden')
})

// Close modal button
document.getElementById('close-modal')?.addEventListener('click', () => {
  document.getElementById('preview-modal').classList.add('hidden')
})

// Preview modal close X button
document.getElementById('preview-modal-close-x')?.addEventListener('click', () => {
  document.getElementById('preview-modal').classList.add('hidden')
})

// Download PDF button
document.getElementById('download-resume')?.addEventListener('click', generatePDF)

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button')
  const tabPanes = document.querySelectorAll('.tab-pane')

  tabButtons.forEach(btn => btn.classList.remove('active'))
  tabPanes.forEach(pane => pane.classList.remove('active'))

  const resumeDetailsButton = document.querySelector('[data-tab="resume-details"]')
  const resumeDetailsPane = document.getElementById('resume-details')
  if (resumeDetailsButton) resumeDetailsButton.classList.add('active')
  if (resumeDetailsPane) resumeDetailsPane.classList.add('active')

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab')
      tabButtons.forEach(btn => btn.classList.remove('active'))
      tabPanes.forEach(pane => pane.classList.remove('active'))
      button.classList.add('active')
      document.getElementById(targetTab).classList.add('active')
    })
  })
}

document.addEventListener('DOMContentLoaded', initializeTabs)

// Template selection and cover letter toggle handlers
document.getElementById('template-select')?.addEventListener('change', (e) => {
  if (window._resumeToRender) {
    const container = document.getElementById('resume-preview-container')
    container.innerHTML = renderTemplate(window._resumeToRender, e.target.value)
  }
})

// Tab functionality for preview modal
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('tab-button')) {
    const targetTab = e.target.getAttribute('data-tab')
    const parentModal = e.target.closest('.modal')
    
    if (parentModal) {
      const tabButtons = parentModal.querySelectorAll('.tab-button')
      const tabPanes = parentModal.querySelectorAll('.tab-pane')
      
      tabButtons.forEach(btn => btn.classList.remove('active'))
      tabPanes.forEach(pane => pane.classList.remove('active'))
      
      e.target.classList.add('active')
      const targetPane = parentModal.querySelector(`#${targetTab}`)
      if (targetPane) {
        targetPane.classList.add('active')
      }
      
      // Update cover letter preview when switching to that tab
      if (targetTab === 'cover-letter-preview-tab' && window._resumeToRender) {
        const coverContainer = document.getElementById('cover-letter-preview-container')
        if (coverContainer) {
          coverContainer.innerHTML = `
            <div class="cover-letter-preview">
              <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${window._resumeToRender.cover_letter || 'No cover letter provided'}</pre>
            </div>
          `
        }
      }
    }
  }
})

async function loadResumes() {
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('❌ Failed to load resumes:', error)
    resumeTableBody.innerHTML = '<tr><td colspan="3">Error loading resumes</td></tr>'
    return
  }

  resumeTableBody.innerHTML = ''
  data.forEach((resume) => {
    const row = document.createElement('tr')
    const profilePreview = resume.profile ? resume.profile.substring(0, 50) + (resume.profile.length > 50 ? '...' : '') : 'No profile'
    row.innerHTML = `
      <td>${resume.resume_name}</td>
      <td>${profilePreview}</td>
      <td>${new Date(resume.updated_at).toLocaleString()}</td>
      <td>
        <button onclick="editResume('${resume.id}')">Edit</button>
        <button onclick="deleteResume('${resume.id}')">Delete</button>
        <button onclick="downloadResume('${resume.id}')">Preview</button>
      </td>
    `
    resumeTableBody.appendChild(row)
  })
}

window.editResume = async function(id) {
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('❌ Failed to fetch resume for editing:', error)
    return
  }

  form['resume-id'].value = data.id
  form['resume-name'].value = data.resume_name
  form['full-name'].value = data.full_name
  form['profile'].value = data.profile
  form['skills'].value = data.skills
  form['experience'].value = data.experience
  form['education'].value = data.education
  form['referees'].value = data.referees
  form['cover-letter'].value = data.cover_letter

  resumeModal.classList.remove('hidden')
  const modalContent = resumeModal.querySelector('.modal-content')
  if (modalContent) {
    modalContent.scrollTop = 0
  }
  initializeTabs()
}

window.deleteResume = async function(id) {
  if (confirm('Delete this resume?')) {
    await supabase.from('resumes').delete().eq('id', id)
    await loadResumes()
  }
}

window.downloadResume = async function(id) {
  const { data, error } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    alert('Could not fetch resume for PDF export')
    return
  }

  const modal = document.getElementById('preview-modal')
  const container = document.getElementById('resume-preview-container')
  const templateSelect = document.getElementById('template-select')
  const coverToggle = document.getElementById('include-cover-letter')

  if (!modal || !container || !templateSelect || !coverToggle) {
    alert('Missing modal elements')
    return
  }

  modal.classList.remove('hidden')
  templateSelect.value = 'template1'
  coverToggle.checked = true

  window._resumeToRender = data
  container.innerHTML = renderTemplate(data, 'template1')
}

async function getUser() {
  const { data, error } = await supabase.auth.getUser()
  return data?.user || null
}

function renderTemplate(resumeData, templateName) {
  const baseStyles = `
    font-family: Arial, sans-serif;
    color: #333;
    line-height: 1.4;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-size: 12px;
  `
  
  const headerStyles = `
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #2e2e8c;
  `
  
  const nameStyles = `
    font-size: 20px;
    font-weight: bold;
    color: #2e2e8c;
    margin: 0;
  `
  
  const sectionStyles = `
    margin-bottom: 25px;
  `
  
  const sectionTitleStyles = `
    font-size: 14px;
    font-weight: bold;
    color: #2e2e8c;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #ccc;
  `
  
  const contentStyles = `
    margin: 0;
    white-space: pre-wrap;
    font-size: 12px;
  `

  const footerStyles = `
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #ccc;
    text-align: center;
    font-size: 10px;
    color: #666;
  `

  return `
    <div style="${baseStyles}">
      <div style="${headerStyles}">
        <h1 style="${nameStyles}">${resumeData.full_name || 'Name not provided'}</h1>
      </div>
      
      <div style="${sectionStyles}">
        <h2 style="${sectionTitleStyles}">Profile</h2>
        <p style="${contentStyles}">${resumeData.profile || 'No profile information'}</p>
      </div>
      
      <div style="${sectionStyles}">
        <h2 style="${sectionTitleStyles}">Skills</h2>
        <p style="${contentStyles}">${resumeData.skills || 'No skills listed'}</p>
      </div>
      
      <div style="${sectionStyles}">
        <h2 style="${sectionTitleStyles}">Experience</h2>
        <p style="${contentStyles}">${resumeData.experience || 'No experience listed'}</p>
      </div>
      
      <div style="${sectionStyles}">
        <h2 style="${sectionTitleStyles}">Education</h2>
        <p style="${contentStyles}">${resumeData.education || 'No education listed'}</p>
      </div>
      
      <div style="${sectionStyles}">
        <h2 style="${sectionTitleStyles}">References</h2>
        <p style="${contentStyles}">${resumeData.referees || 'No references provided'}</p>
      </div>
      
      <div style="${footerStyles}">
        <p>Created with CareerTeen Resume Builder</p>
      </div>
    </div>
  `
}