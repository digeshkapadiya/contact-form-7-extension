# Project Quote Request Form Example

An interactive project inquiry and estimate request form utilizing select pipes, multi-choice checkboxes, budget sliders, and target start dates.

---

## 1. Form Template (Paste into Form Tab)

```html
<div class="cf7-form-container">
  <div class="cf7-row">
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="quote-client-name">Your Name <span class="required">*</span></label>
        [text* client-name id:quote-client-name placeholder "Alex Morgan"]
      </div>
    </div>
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="quote-company-name">Company / Organization</label>
        [text company-name id:quote-company-name placeholder "Acme Corporation"]
      </div>
    </div>
  </div>

  <div class="cf7-row">
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="quote-client-email">Work Email <span class="required">*</span></label>
        [email* client-email id:quote-client-email placeholder "alex@acme.com"]
      </div>
    </div>
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="quote-client-phone">Phone Number</label>
        [tel client-phone id:quote-client-phone placeholder "+1 (555) 987-6543"]
      </div>
    </div>
  </div>

  <!-- Routing Department with Pipes syntax -->
  <div class="cf7-form-group">
    <label for="quote-department">Primary Department for Inquiry <span class="required">*</span></label>
    [select* target-department id:quote-department include_blank
      "Custom Software & Web Development|dev-leads@yourdomain.com"
      "Branding & UI/UX Design|design-leads@yourdomain.com"
      "Digital Marketing & SEO|marketing-leads@yourdomain.com"
      "Enterprise Consulting|enterprise@yourdomain.com"]
  </div>

  <div class="cf7-form-group">
    <label>Services Needed (Select all that apply)</label>
    [checkbox project-services use_label_element
      "Full Website Redesign"
      "E-Commerce Integration"
      "API Development"
      "Speed Optimization"
      "Ongoing Maintenance"]
  </div>

  <div class="cf7-row">
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="quote-budget">Estimated Budget</label>
        [select estimated-budget id:quote-budget
          "$5,000 - $10,000"
          "$10,000 - $25,000"
          "$25,000 - $50,000"
          "$50,000+"]
      </div>
    </div>
    <div class="cf7-col-6">
      <div class="cf7-form-group">
        <label for="quote-start-date">Desired Start Date</label>
        [date target-start-date id:quote-start-date min:2026-01-01]
      </div>
    </div>
  </div>

  <div class="cf7-form-group">
    <label for="quote-project-details">Project Summary & Goals <span class="required">*</span></label>
    [textarea* project-summary id:quote-project-details x4 placeholder "Briefly describe your objectives, target audience, and timeline..."]
  </div>

  <div class="cf7-form-group">
    [submit class:cf7-btn-submit "Request Estimate"]
  </div>
</div>
```

---

## 2. Mail Configuration (Mail Tab)

* **To**: `[target-department]` *(Resolves to the piped email address)*
* **From**: `[_site_title] Quotes <no-reply@yourdomain.com>`
* **Subject**: `[Quote Request] [_raw_target-department] - [client-name] ([company-name])`
* **Additional Headers**: `Reply-To: [client-name] <[client-email]>`
* **Message Body**:
```text
New Project Estimate Request:

Client: [client-name]
Company: [company-name]
Email: [client-email]
Phone: [client-phone]

Department: [_raw_target-department]
Services Requested: [project-services]
Estimated Budget: [estimated-budget]
Target Start Date: [target-start-date]

Project Summary:
[project-summary]

---
Source: [_url]
Submitted on: [_date] at [_time]
```
