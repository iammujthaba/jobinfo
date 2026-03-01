document.addEventListener("DOMContentLoaded", function() {
  const toggleBtn = document.getElementById('toggle-question-form');
  const questionFormWrapper = document.getElementById('question-form-wrapper');
  const questionForm = document.getElementById('submit-question-form');
  const submitBtn = questionForm.querySelector('button[type="submit"]');

  toggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (questionFormWrapper.style.display === 'none') {
      questionFormWrapper.style.display = 'block';
      toggleBtn.style.display = 'none';
    }
  });

  questionForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    submitBtn.innerText = 'Submitting...';
    submitBtn.disabled = true;

    const formData = new FormData(questionForm);
    const data = Object.fromEntries(formData.entries());
    if (data.whatsapp) {
      data.wa_number = data.whatsapp;
      delete data.whatsapp;
    }
    const scriptURL = (typeof JOBINFO_CONFIG !== 'undefined' ? JOBINFO_CONFIG.API_URL : '') + '/api/questions';

    fetch(scriptURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (!response.ok) throw new Error('API Request Failed');
      return response.json();
    })
    .then(data => {
      swal("Success!", "Your question has been submitted! We will reach out to you via WhatsApp. Thank you!", "success");
      questionForm.reset();
      questionFormWrapper.style.display = 'none';
      toggleBtn.style.display = 'inline-block';
      toggleBtn.innerText = 'Ask Another Question';
      submitBtn.innerText = 'Submit';
      submitBtn.disabled = false;
    })
    .catch(error => {
      console.error('Error!', error.message);
      swal("Error", "There was a problem submitting your question.", "error");
      submitBtn.innerText = 'Submit';
      submitBtn.disabled = false;
    });
  });
});
