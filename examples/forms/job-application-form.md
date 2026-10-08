# Job Application Form Example

A multi-field career application form with resume file upload, salary expectations, position selector, and privacy acceptance.

---

## 1. Form Template (Paste into Form Tab)

```html
<div class="cf7-form-container">
  <div class="cf7-row">
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="applicant-first-name">First Name <span class="required">*</span></label>
        [text* first-name id:applicant-first-name placeholder "Jane"]
      </div>
    </div>
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="applicant-last-name">Last Name <span class="required">*</span></label>
        [text* last-name id:applicant-last-name placeholder "Doe"]
      </div>
    </div>
  </div>

  <div class="cf7-row">
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="applicant-email">Email Address <span class="required">*</span></label>
        [email* applicant-email id:applicant-email placeholder "jane.doe@example.com"]
      </div>
    </div>
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="applicant-phone">Phone Number <span class="required">*</span></label>
        [tel* applicant-phone id:applicant-phone placeholder "+1 (555) 234-5678"]
      </div>
    </div>
  </div>

  <div class="cf7-row">
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="applicant-position">Position Applied For <span class="required">*</span></label>
        [select* applied-position id:applicant-position include_blank
          "Frontend Developer"
          "Backend Developer (WordPress / PHP)"
          "UI/UX Designer"
          "Product Manager"]
      </div>
    </div>
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="applicant-experience">Years of Experience <span class="required">*</span></label>
        [select* experience-years id:applicant-experience
          "1-2 Years"
          "3-5 Years"
          "5-8 Years"
          "8+ Years"]
      </div>
    </div>
  </div>

  <div class="cf7-form-group">
    <label for="applicant-portfolio">Portfolio / LinkedIn URL</label>
    [url applicant-portfolio id:applicant-portfolio placeholder "https://linkedin.com/in/janedoe"]
  </div>

  <div class="cf7-form-group">
    <label for="applicant-resume">Resume / CV (PDF or DOCX, max 5MB) <span class="required">*</span></label>
    [file* applicant-resume id:applicant-resume filetypes:pdf|docx limit:5mb]
  </div>

  <div class="cf7-form-group">
    <label for="applicant-cover-letter">Cover Letter / Note</label>
    [textarea applicant-cover-letter id:applicant-cover-letter placeholder "Why are you interested in joining our team?"]
  </div>

  <div class="cf7-form-group">
    [acceptance gdpr-consent] I agree to the storage and processing of my personal data for recruitment purposes.[/acceptance]
  </div>

  <div class="cf7-form-group">
    [submit class:cf7-btn-submit "Submit Application"]
  </div>
</div>
```

---

## 2. Mail Configuration (Mail Tab)

* **To**: `careers@yourdomain.com`
* **From**: `[_site_title] Careers <no-reply@yourdomain.com>`
* **Subject**: `[Job Application] [applied-position] - [first-name] [last-name]`
* **Additional Headers**: `Reply-To: [first-name] [last-name] <[applicant-email]>`
* **File Attachments**: `[applicant-resume]` *(Place here, NOT in Message Body)*
* **Message Body**:
```text
New Job Application Received:

Applicant: [first-name] [last-name]
Email: [applicant-email]
Phone: [applicant-phone]
Position: [applied-position]
Experience: [experience-years]
Portfolio/LinkedIn: [applicant-portfolio]

Cover Letter:
[applicant-cover-letter]

Resume Attached: [applicant-resume]

---
Submitted from: [_url]
Date: [_date] [_time]
```
